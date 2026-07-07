/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Consultant, Shift, ShiftType, LeaveRequest, Holiday, LeaveType, RequestKind, ShiftPreference } from './types';
import { subscribeDataset, saveDataset, subscribeConfig, saveConfig } from './dataStore';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import Login from './components/Login';

import DailyList from './components/DailyList';
import MonthlyGrid from './components/MonthlyGrid';
import ManualBuilder from './components/ManualBuilder';
import LeaveRequests from './components/LeaveRequests';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import RosterCalendar from './components/RosterCalendar';
import VacationCalendar from './components/VacationCalendar';

import { Calendar, ClipboardList, BarChart3, Settings as SettingsIcon, Stethoscope, ChevronLeft, ChevronRight, FileDown, CalendarCheck, Palmtree } from 'lucide-react';

type Tab = 'Schedule' | 'Roster' | 'Vacations' | 'Requests' | 'Analytics' | 'Settings';
type ScheduleSubTab = 'DailyList' | 'MonthlyGrid' | 'ManualBuilder';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Schedule');
  const [scheduleSubTab, setScheduleSubTab] = useState<ScheduleSubTab>('DailyList');

  // Month & Year Filter state (defaulting to July 2026 as per mock data and system time)
  const [currentMonth, setCurrentMonth] = useState<number>(6); // July (0-indexed)
  const [currentYear, setCurrentYear] = useState<number>(2026);

  // Selected date for manual builder redirection
  const [selectedBuilderDate, setSelectedBuilderDate] = useState<string>('');

  // Loaded database state
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('icu_dark_mode');
    if (stored !== null) return stored === 'true';
    return false;
  });

  // Authentication state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Access control: list of admin emails, and whether it has loaded yet.
  const [admins, setAdmins] = useState<string[]>([]);
  const [roleReady, setRoleReady] = useState<boolean>(false);

  // Track the signed-in user.
  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setAuthUser(user);
      setAuthLoading(false);
    });
  }, []);

  // Load the access config once signed in. The very first user to sign in
  // (no config document yet) is bootstrapped as the sole administrator.
  useEffect(() => {
    if (!authUser) {
      setRoleReady(false);
      setAdmins([]);
      return;
    }
    const unsub = subscribeConfig(
      (cfg, exists) => {
        if (!exists) {
          const email = authUser.email;
          if (email) {
            setAdmins([email]);
            saveConfig({ admins: [email] });
          } else {
            setAdmins([]);
          }
        } else {
          setAdmins(cfg.admins);
        }
        setRoleReady(true);
      },
      err => {
        console.error('Firestore "config" subscription failed:', err);
        setRoleReady(true);
      }
    );
    return unsub;
  }, [authUser]);

  const isAdmin = !!authUser?.email && admins.includes(authUser.email);

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleUpdateAdmins = (nextAdmins: string[]) => {
    setAdmins(nextAdmins);
    saveConfig({ admins: nextAdmins });
  };

  // Subscribe to Firestore for permanent, shared, real-time data — only once
  // signed in (the security rules require authentication). On first run (no
  // cloud document yet), any data still in this browser's localStorage is
  // migrated up to the cloud so nothing is lost.
  useEffect(() => {
    if (!authUser) return;

    const subscribe = <T,>(
      name: 'consultants' | 'shifts' | 'leaves' | 'holidays',
      localKey: string,
      setter: (v: T[]) => void
    ) =>
      subscribeDataset<T>(
        name,
        (items, exists) => {
          if (exists) {
            setter(items);
            return;
          }
          // No cloud document yet — seed it from any legacy local data.
          let local: T[] = [];
          try {
            const raw = localStorage.getItem(localKey);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) local = parsed as T[];
          } catch {
            /* ignore malformed local cache */
          }
          setter(local);
          if (local.length > 0) saveDataset(name, local);
        },
        err => console.error(`Firestore "${name}" subscription failed:`, err)
      );

    const unsubs = [
      subscribe<Consultant>('consultants', 'icu_consultants', setConsultants),
      subscribe<Shift>('shifts', 'icu_shifts', setShifts),
      subscribe<LeaveRequest>('leaves', 'icu_leaves', setLeaves),
      subscribe<Holiday>('holidays', 'icu_holidays', setHolidays)
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, [authUser]);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('icu_dark_mode', String(darkMode));
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const isSelectedPeriod = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number);
    return y === currentYear && (m - 1) === currentMonth;
  };

  // 1. Shift Assignment update
  const handleUpdateShift = (date: string, type: ShiftType, consultantId: string | null) => {
    const updated = [...shifts];
    const index = updated.findIndex(s => s.date === date && s.type === type);

    if (index !== -1) {
      updated[index].consultantId = consultantId;
    } else {
      updated.push({
        id: `shift-${date}-${type}`,
        date,
        type,
        consultantId
      });
    }

    setShifts(updated);
    saveDataset('shifts', updated);
  };

  // 2. Smart Auto-Fill — weekly block rotation driven by a user-defined pattern.
  // The Schedule tab lets the user choose which consultant covers each week;
  // this executes that pattern. Rules:
  //   1. One consultant covers the whole day (Morning + Evening + Night).
  //   2. The same consultant covers every day of their calendar week.
  //   3. Each week follows the user's chosen pattern (weeks left blank are skipped).
  // Rebuilds the selected month only; other months are untouched.
  const handleAutoFill = (pattern: string[]) => {
    const activeConsultants = consultants.filter(c => c.active);
    if (activeConsultants.length === 0) {
      alert('No active consultants available to build the rota. Add or activate consultants in Settings first.');
      return;
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Day-of-week of the 1st (0 = Sunday) — used to align weeks with the Monthly Grid (Sun–Sat rows).
    const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay();
    const shiftTypes: ShiftType[] = ['Morning', 'Evening', 'Night'];

    // Preserve shifts from other months, rebuild the current month from scratch.
    const preservedShifts = shifts.filter(s => !isSelectedPeriod(s.date));
    const monthShifts: Shift[] = [];
    const weeksFilled = new Set<number>();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      // Which calendar-week row of the month this day falls in (0-indexed).
      const weekIndex = Math.floor((firstDayOffset + d - 1) / 7);

      // Resolve this week's consultant from the user's pattern.
      let consultantId: string | null;
      if (weekIndex < pattern.length) {
        // An empty pattern slot means "leave this week unassigned".
        consultantId = pattern[weekIndex] || null;
      } else {
        // No pattern entry for this week — fall back to a simple rotation.
        consultantId = activeConsultants[weekIndex % activeConsultants.length].id;
      }

      // Guard against a consultant removed/deactivated after the pattern was set.
      if (consultantId && !activeConsultants.some(c => c.id === consultantId)) {
        consultantId = activeConsultants[weekIndex % activeConsultants.length].id;
      }
      if (consultantId) weeksFilled.add(weekIndex);

      // Assign all three daily shifts to this week's consultant (or leave unassigned).
      shiftTypes.forEach(type => {
        monthShifts.push({
          id: `shift-${dateStr}-${type}`,
          date: dateStr,
          type,
          consultantId
        });
      });
    }

    const updated = [...preservedShifts, ...monthShifts];
    setShifts(updated);
    saveDataset('shifts', updated);
    alert(
      `Rota generated for ${getMonthName(currentMonth)} ${currentYear} from your weekly pattern: ` +
      `${weeksFilled.size} week(s) assigned, each fully covered by one consultant across all 3 daily shifts.`
    );
  };

  // 3. Leave Requests actions
  const handleApproveLeave = (id: string) => {
    const updated = leaves.map(l => (l.id === id ? { ...l, status: 'Approved' as const } : l));
    setLeaves(updated);
    saveDataset('leaves', updated);
  };

  const handleRejectLeave = (id: string) => {
    const updated = leaves.map(l => (l.id === id ? { ...l, status: 'Rejected' as const } : l));
    setLeaves(updated);
    saveDataset('leaves', updated);
  };

  const handleSubmitLeave = (
    consultantId: string,
    consultantName: string,
    type: LeaveType,
    startDate: string,
    endDate: string,
    reason: string,
    kind: RequestKind = 'Leave',
    shift?: ShiftPreference
  ) => {
    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      consultantId,
      consultantName,
      type,
      startDate,
      endDate,
      status: 'Pending',
      reason,
      kind
    };
    // Only include `shift` when set — Firestore rejects undefined values.
    if (shift) newRequest.shift = shift;

    const updated = [newRequest, ...leaves];
    setLeaves(updated);
    saveDataset('leaves', updated);
  };

  const handleUpdateLeave = (request: LeaveRequest) => {
    const updated = leaves.map(l => (l.id === request.id ? request : l));
    setLeaves(updated);
    saveDataset('leaves', updated);
  };

  const handleDeleteLeave = (id: string) => {
    const updated = leaves.filter(l => l.id !== id);
    setLeaves(updated);
    saveDataset('leaves', updated);
  };

  // 4. Consultants CRUD
  const handleAddConsultant = (name: string, role: string, avatar?: string) => {
    const newC: Consultant = {
      id: `c-${Date.now()}`,
      name,
      role,
      avatar: avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=200&auto=format&fit=crop',
      active: true
    };
    const updated = [...consultants, newC];
    setConsultants(updated);
    saveDataset('consultants', updated);
  };

  const handleDeleteConsultant = (id: string) => {
    const updated = consultants.filter(c => c.id !== id);
    setConsultants(updated);
    saveDataset('consultants', updated);
  };

  // 5. Holidays CRUD
  const handleAddHoliday = (name: string, date: string) => {
    const newH: Holiday = {
      id: `holiday-${Date.now()}`,
      name,
      date
    };
    const updated = [...holidays, newH];
    setHolidays(updated);
    saveDataset('holidays', updated);
  };

  const handleDeleteHoliday = (id: string) => {
    const updated = holidays.filter(h => h.id !== id);
    setHolidays(updated);
    saveDataset('holidays', updated);
  };

  const getMonthName = (monthIdx: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIdx];
  };

  const handleSelectMonthlyGridDate = (dateStr: string) => {
    setSelectedBuilderDate(dateStr);
    setScheduleSubTab('ManualBuilder');
  };

  // Export the selected month's rota as a printable table (browser → Save as PDF).
  const handleExportPdf = () => {
    const escapeHtml = (str: string) =>
      str.replace(/[&<>"']/g, ch =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string)
      );

    const nameOf = (id: string | null | undefined) => {
      if (!id) return '—';
      const c = consultants.find(x => x.id === id);
      return c ? escapeHtml(c.name) : '—';
    };

    const monthName = getMonthName(currentMonth);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let rows = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateObj = new Date(currentYear, currentMonth, d);
      const dow = dateObj.getDay();
      const isWeekend = dow === 5 || dow === 6; // Fri / Sat
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const m = shifts.find(s => s.date === dateStr && s.type === 'Morning');
      const e = shifts.find(s => s.date === dateStr && s.type === 'Evening');
      const n = shifts.find(s => s.date === dateStr && s.type === 'Night');

      rows += `<tr class="${isWeekend ? 'weekend' : ''}">
        <td class="num">${d}</td>
        <td>${weekday}</td>
        <td>${nameOf(m?.consultantId)}</td>
        <td>${nameOf(e?.consultantId)}</td>
        <td>${nameOf(n?.consultantId)}</td>
      </tr>`;
    }

    // Leave / vacation requests overlapping this month (on-call preferences excluded).
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStart = `${currentYear}-${pad(currentMonth + 1)}-01`;
    const monthEnd = `${currentYear}-${pad(currentMonth + 1)}-${pad(daysInMonth)}`;
    const fmt = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const monthLeaves = leaves
      .filter(l => l.kind !== 'OnCall' && l.startDate <= monthEnd && l.endDate >= monthStart)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    let leaveRows = '';
    if (monthLeaves.length === 0) {
      leaveRows = `<tr><td colspan="5" class="empty">No leave or vacation requests for this month.</td></tr>`;
    } else {
      monthLeaves.forEach(l => {
        const statusClass =
          l.status === 'Approved' ? 'st-approved' : l.status === 'Rejected' ? 'st-rejected' : 'st-pending';
        leaveRows += `<tr>
        <td>${escapeHtml(l.consultantName)}</td>
        <td>${escapeHtml(l.type)}</td>
        <td>${fmt(l.startDate)}</td>
        <td>${fmt(l.endDate)}</td>
        <td class="${statusClass}">${escapeHtml(l.status)}</td>
      </tr>`;
      });
    }

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ICU Rota — ${monthName} ${currentYear}</title>
  <style>
    * { box-sizing: border-box; }
    /* Force background colours (weekend highlight) to print. */
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a1c1e; margin: 0; padding: 8px 12px; font-size: 10px; }
    h1 { font-size: 15px; margin: 0 0 1px; }
    h2 { font-size: 11px; font-weight: 600; color: #0058bc; margin: 0 0 6px; }
    h2.section { font-size: 11px; margin: 10px 0 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th, td { border: 1px solid #c3c7cf; padding: 1.5px 5px; text-align: left; }
    thead th { background: #0058bc; color: #fff; font-size: 8.5px; text-transform: uppercase; letter-spacing: .03em; }
    td.num { text-align: center; font-weight: 700; width: 24px; }
    tr:nth-child(even):not(.weekend) td { background: #f4f6fb; }
    /* Weekend (Fri/Sat) rows — strong highlight. */
    tr.weekend td { background: #ffd9b3; color: #7c2e00; font-weight: 700; }
    .st-approved { color: #1d7a3e; font-weight: 700; }
    .st-rejected { color: #ba1a1a; font-weight: 700; }
    .st-pending { color: #9e3d00; font-weight: 700; }
    .empty { text-align: center; color: #73777f; font-style: italic; }
    .footer { margin-top: 6px; font-size: 8px; color: #73777f; }
    @page { size: A4 portrait; margin: 9mm; }
    @media print { tr { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>ICU Consultant Rota</h1>
  <h2>${monthName} ${currentYear}</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Day</th>
        <th>Morning<br/>08:00–16:00</th>
        <th>Evening<br/>16:01–00:00</th>
        <th>Night<br/>00:01–07:59</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <h2 class="section">Leave &amp; Vacation Requests — ${monthName} ${currentYear}</h2>
  <table>
    <thead>
      <tr><th>Consultant</th><th>Type</th><th>From</th><th>To</th><th>Status</th></tr>
    </thead>
    <tbody>${leaveRows}</tbody>
  </table>

  <p class="footer">Weekends (Fri/Sat) highlighted in orange. Generated ${escapeHtml(new Date().toLocaleString())} · ICU Consultant Management System.</p>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow pop-ups for this site to export the rota as a PDF.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Give the new window a moment to render before invoking the print dialog.
    setTimeout(() => win.print(), 350);
  };

  // Export all app data (consultants, shifts, leaves, holidays) to a JSON backup file.
  const handleExportData = () => {
    const data = {
      app: 'ICU Consultant Management System',
      version: 1,
      exportedAt: new Date().toISOString(),
      consultants,
      shifts,
      leaves,
      holidays
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icu-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Restore all app data from a previously exported JSON backup file.
  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const nextConsultants = Array.isArray(parsed?.consultants) ? parsed.consultants : null;
        const nextShifts = Array.isArray(parsed?.shifts) ? parsed.shifts : null;
        const nextLeaves = Array.isArray(parsed?.leaves) ? parsed.leaves : null;
        const nextHolidays = Array.isArray(parsed?.holidays) ? parsed.holidays : null;

        if (!nextConsultants && !nextShifts && !nextLeaves && !nextHolidays) {
          throw new Error('No recognizable ICU data found in this file.');
        }
        if (!window.confirm('Importing will REPLACE all current data (consultants, shifts, leaves, holidays) with this backup. Continue?')) {
          return;
        }

        if (nextConsultants) { setConsultants(nextConsultants); saveDataset('consultants', nextConsultants); }
        if (nextShifts) { setShifts(nextShifts); saveDataset('shifts', nextShifts); }
        if (nextLeaves) { setLeaves(nextLeaves); saveDataset('leaves', nextLeaves); }
        if (nextHolidays) { setHolidays(nextHolidays); saveDataset('holidays', nextHolidays); }

        alert('Backup imported successfully.');
      } catch (err) {
        alert('Could not import this file. Make sure it is an ICU backup exported from this app.\n\n' + (err instanceof Error ? err.message : ''));
      }
    };
    reader.onerror = () => alert('Failed to read the selected file.');
    reader.readAsText(file);
  };

  // Gate the app behind authentication.
  if (authLoading || (authUser && !roleReady)) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#121214] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!authUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121214] text-on-surface dark:text-inverse-on-surface pb-32 transition-colors duration-300">
      {/* Top Header App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary dark:text-primary-fixed" />
          <h1 className="text-headline-sm font-headline-sm font-bold text-on-surface dark:text-inverse-on-surface">
            ICU Consultant
          </h1>
        </div>

        {/* Dynamic Month / Year Filter controls */}
        <div className="flex items-center gap-2">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(Number(e.target.value))}
            className="bg-surface-container dark:bg-[#2C2C2E] border-none text-[12px] font-bold rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary text-on-surface dark:text-inverse-on-surface outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }).map((_, idx) => (
              <option key={idx} value={idx}>
                {getMonthName(idx)}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="bg-surface-container dark:bg-[#2C2C2E] border-none text-[12px] font-bold rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary text-on-surface dark:text-inverse-on-surface outline-none cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-6">
        {/* Tab-specific Page Header */}
        <section className="space-y-4">
          {activeTab === 'Schedule' && (
            <>
              <p className="text-primary font-bold text-label-caps uppercase tracking-wider">
                ICU ROTA CYCLE
              </p>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-headline-lg-mobile font-bold text-on-surface dark:text-inverse-on-surface">
                  {getMonthName(currentMonth)} {currentYear} Schedule
                </h2>
                <button
                  onClick={handleExportPdf}
                  className="shrink-0 flex items-center gap-2 text-primary dark:text-primary-fixed bg-primary/10 border border-primary/20 font-bold text-xs px-3 py-2 rounded-lg hover:bg-primary/20 active:scale-95 transition-all cursor-pointer"
                >
                  <FileDown className="w-4 h-4" /> Export PDF
                </button>
              </div>

              {/* Rota Sub-navigation Tabs */}
              <div className="flex bg-surface-container dark:bg-[#1C1C1E] rounded-xl p-1 mt-4">
                {((isAdmin ? ['DailyList', 'MonthlyGrid', 'ManualBuilder'] : ['DailyList', 'MonthlyGrid']) as ScheduleSubTab[]).map(sub => {
                  const labels: Record<ScheduleSubTab, string> = {
                    DailyList: 'Daily List',
                    MonthlyGrid: 'Monthly Grid',
                    ManualBuilder: 'Manual Builder'
                  };
                  return (
                    <button
                      key={sub}
                      onClick={() => setScheduleSubTab(sub)}
                      className={`flex-1 py-2 text-center rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                        scheduleSubTab === sub
                          ? 'bg-surface-container-lowest dark:bg-[#2C2C2E] text-primary dark:text-primary-fixed font-bold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface dark:text-outline dark:hover:text-inverse-on-surface'
                      }`}
                    >
                      {labels[sub]}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'Roster' && (
            <>
              <p className="text-primary font-bold text-label-caps uppercase tracking-wider">
                PUBLISHED ROTA
              </p>
              <h2 className="text-headline-lg-mobile font-bold text-on-surface dark:text-inverse-on-surface">
                Roster Calendar
              </h2>
              <p className="text-body-md text-on-surface-variant dark:text-outline">
                Read-only view of the schedule for the current and previous months.
              </p>
            </>
          )}

          {activeTab === 'Vacations' && (
            <>
              <p className="text-primary font-bold text-label-caps uppercase tracking-wider">
                APPROVED LEAVE
              </p>
              <h2 className="text-headline-lg-mobile font-bold text-on-surface dark:text-inverse-on-surface">
                Vacation Calendar
              </h2>
              <p className="text-body-md text-on-surface-variant dark:text-outline">
                Approved vacations shown as a bar from start to end of each period.
              </p>
            </>
          )}

          {activeTab === 'Requests' && (
            <>
              <p className="text-primary font-bold text-label-caps uppercase tracking-wider">
                STAFF PREFERENCES
              </p>
              <h2 className="text-headline-lg-mobile font-bold text-on-surface dark:text-inverse-on-surface">
                Leave & Requests
              </h2>
              <p className="text-body-md text-on-surface-variant dark:text-outline">
                Manage department schedules, vacations, and preferred work dates.
              </p>
            </>
          )}

          {activeTab === 'Analytics' && (
            <>
              <p className="text-primary font-bold text-label-caps uppercase tracking-wider">
                STAFF STATISTICS
              </p>
              <h2 className="text-headline-lg-mobile font-bold text-on-surface dark:text-inverse-on-surface">
                Performance Analytics
              </h2>
              <p className="text-body-md text-on-surface-variant dark:text-outline">
                Monthly roster assignments, Friday/Saturday weekend shifts, and vacation metrics.
              </p>
            </>
          )}

          {activeTab === 'Settings' && (
            <>
              <p className="text-primary font-bold text-label-caps uppercase tracking-wider">
                ADMINISTRATIVE CONTROL
              </p>
              <h2 className="text-headline-lg-mobile font-bold text-on-surface dark:text-inverse-on-surface">
                System Settings
              </h2>
            </>
          )}
        </section>

        {/* Dynamic Views Router */}
        <section className="pb-16">
          {activeTab === 'Schedule' && scheduleSubTab === 'DailyList' && (
            <DailyList
              currentYear={currentYear}
              currentMonth={currentMonth}
              consultants={consultants}
              shifts={shifts}
              leaves={leaves}
              onUpdateShift={handleUpdateShift}
              onAutoFill={handleAutoFill}
              isAdmin={isAdmin}
            />
          )}

          {activeTab === 'Schedule' && scheduleSubTab === 'MonthlyGrid' && (
            <MonthlyGrid
              currentYear={currentYear}
              currentMonth={currentMonth}
              consultants={consultants}
              shifts={shifts}
              onSelectDate={isAdmin ? handleSelectMonthlyGridDate : () => {}}
            />
          )}

          {activeTab === 'Schedule' && scheduleSubTab === 'ManualBuilder' && isAdmin && (
            <ManualBuilder
              consultants={consultants}
              shifts={shifts}
              initialSelectedDate={selectedBuilderDate}
              onUpdateShift={handleUpdateShift}
            />
          )}

          {activeTab === 'Roster' && (
            <RosterCalendar
              currentYear={currentYear}
              currentMonth={currentMonth}
              consultants={consultants}
              shifts={shifts}
            />
          )}

          {activeTab === 'Vacations' && (
            <VacationCalendar
              currentYear={currentYear}
              currentMonth={currentMonth}
              consultants={consultants}
              leaves={leaves}
            />
          )}

          {activeTab === 'Requests' && (
            <LeaveRequests
              currentYear={currentYear}
              currentMonth={currentMonth}
              consultants={consultants}
              leaves={leaves}
              onApproveLeave={handleApproveLeave}
              onRejectLeave={handleRejectLeave}
              onSubmitLeave={handleSubmitLeave}
              onUpdateLeave={handleUpdateLeave}
              onDeleteLeave={handleDeleteLeave}
              isAdmin={isAdmin}
              currentUserId={authUser.uid}
              currentUserName={authUser.displayName || authUser.email || 'User'}
            />
          )}

          {activeTab === 'Analytics' && (
            <Analytics
              currentYear={currentYear}
              currentMonth={currentMonth}
              consultants={consultants}
              shifts={shifts}
              leaves={leaves}
            />
          )}

          {activeTab === 'Settings' && (
            <Settings
              consultants={consultants}
              holidays={holidays}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              onAddConsultant={handleAddConsultant}
              onDeleteConsultant={handleDeleteConsultant}
              onAddHoliday={handleAddHoliday}
              onDeleteHoliday={handleDeleteHoliday}
              onExportData={handleExportData}
              onImportData={handleImportData}
              userEmail={authUser.email}
              onSignOut={handleSignOut}
              isAdmin={isAdmin}
              admins={admins}
              onUpdateAdmins={handleUpdateAdmins}
            />
          )}
        </section>
      </main>

      {/* Fixed Bottom Device iOS Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-surface/90 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-lg flex justify-around items-center h-16 pb-safe">
        {[
          { tab: 'Schedule', icon: Calendar, label: 'Schedule' },
          { tab: 'Roster', icon: CalendarCheck, label: 'Roster' },
          { tab: 'Vacations', icon: Palmtree, label: 'Vacations' },
          { tab: 'Requests', icon: ClipboardList, label: 'Requests' },
          { tab: 'Analytics', icon: BarChart3, label: 'Analytics' },
          { tab: 'Settings', icon: SettingsIcon, label: 'Settings' }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab as Tab)}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 px-0.5 py-1 transition-all active:scale-90 duration-150 cursor-pointer ${
                isActive
                  ? 'text-primary dark:text-primary-fixed font-bold'
                  : 'text-on-surface-variant dark:text-outline hover:text-on-surface dark:hover:text-inverse-on-surface'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
              <span className="text-[10px] mt-0.5 font-semibold truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
