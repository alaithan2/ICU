/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Consultant, Shift, ShiftType, Holiday, LeaveRequest } from '../types';
import { Sparkles, ChevronDown, ChevronUp, Repeat } from 'lucide-react';
import { getConsultantColor, getInitials } from '../utils/consultantColors';
import { todayStr, isWeekendStr } from '../utils/dates';

interface DailyListProps {
  currentYear: number;
  currentMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  consultants: Consultant[];
  shifts: Shift[];
  leaves: LeaveRequest[];
  onUpdateShift: (date: string, type: ShiftType, consultantId: string | null) => void;
  onAutoFill: (pattern: string[]) => void;
  isAdmin: boolean;
}

export default function DailyList({
  currentYear,
  currentMonth,
  consultants,
  shifts,
  leaves,
  onUpdateShift,
  onAutoFill,
  isAdmin
}: DailyListProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Get number of days in the current selected month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Generate array of date strings for the month (YYYY-MM-DD)
  const dateStrings: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dateStrings.push(dayStr);
  }

  // --- Weekly rotation pattern ------------------------------------------------
  // Only active consultants can be placed in the pattern.
  const activeConsultants = consultants.filter(c => c.active);
  const activeIdsKey = activeConsultants.map(c => c.id).join(',');

  // Day-of-week of the 1st (0 = Sunday) and how many calendar-week rows the month spans.
  const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay();
  const weeksCount = Math.ceil((firstDayOffset + daysInMonth) / 7);

  // pattern[weekIndex] = consultantId to cover that whole week ('' = skip the week).
  const [pattern, setPattern] = useState<string[]>([]);

  // Keep the pattern sized to the current month; default new/invalid weeks to a
  // simple rotation, while preserving choices the user already made.
  useEffect(() => {
    setPattern(prev => {
      const next: string[] = [];
      for (let i = 0; i < weeksCount; i++) {
        const existing = prev[i];
        const stillValid =
          existing !== undefined &&
          (existing === '' || activeConsultants.some(c => c.id === existing));
        next[i] = stillValid
          ? existing
          : activeConsultants.length > 0
            ? activeConsultants[i % activeConsultants.length].id
            : '';
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeksCount, activeIdsKey, currentMonth, currentYear]);

  const setPatternWeek = (index: number, consultantId: string) => {
    setPattern(prev => {
      const next = [...prev];
      next[index] = consultantId;
      return next;
    });
  };

  const weekRangeLabel = (weekIndex: number) => {
    const startDay = Math.max(1, weekIndex * 7 - firstDayOffset + 1);
    const endDay = Math.min(daysInMonth, weekIndex * 7 + 6 - firstDayOffset + 1);
    const start = new Date(currentYear, currentMonth, startDay).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    return `${start} – ${endDay}`;
  };

  // Helper to format date label (e.g., "Monday, Oct 12")
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Helper to get status of the day: "FULL TEAM" (all 3 filled), "EMPTY" (none), "NORMAL" (some filled)
  const getDayStatus = (dateStr: string) => {
    const dayShifts = ['Morning', 'Evening', 'Night'].map(t =>
      shifts.find(s => s.date === dateStr && s.type === t)
    );

    const filledCount = dayShifts.filter(s => s && s.consultantId).length;

    if (filledCount === 3) return { label: 'FULL TEAM', color: 'text-secondary bg-secondary-fixed/30 border-secondary/20' };
    if (filledCount === 0) return { label: 'EMPTY', color: 'text-outline bg-surface-container border-outline-variant/30' };
    return { label: 'NORMAL', color: 'text-on-surface-variant bg-surface-container-high border-outline-variant/10' };
  };

  const toggleDayExpanded = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  return (
    <div id="daily-list-view" className="space-y-6">
      {/* Weekly Rotation Pattern editor (admin only) */}
      {isAdmin && (
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Weekly Rotation Pattern</h3>
            <p className="text-label-sm text-on-surface-variant">
              Choose who covers each week, then run Smart Auto-Fill to build the rota.
            </p>
          </div>
        </div>

        {activeConsultants.length === 0 ? (
          <div className="text-body-md text-outline italic py-2">
            No active consultants yet — add consultants in Settings to build a pattern.
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {Array.from({ length: weeksCount }).map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-40 bg-surface-container-low rounded-lg border border-outline-variant/20 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-label-caps text-primary uppercase font-bold text-[11px]">
                      Week {i + 1}
                    </span>
                    <span className="text-[10px] text-outline font-semibold">{weekRangeLabel(i)}</span>
                  </div>
                  <select
                    value={pattern[i] ?? ''}
                    onChange={(e) => setPatternWeek(i, e.target.value)}
                    className="w-full bg-surface-container border-none text-xs rounded-lg px-2 py-2 font-medium text-on-surface focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                  >
                    <option value="">— Skip week —</option>
                    {activeConsultants.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              id="smart-autofill-btn"
              onClick={() => onAutoFill(pattern)}
              className="w-full bg-primary text-on-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-md hover:bg-primary-container active:scale-[0.98] transition-all duration-200 cursor-pointer font-bold"
            >
              <Sparkles className="w-5 h-5 animate-spin-slow text-white" />
              <span className="text-body-md">Run Smart Auto-Fill</span>
            </button>
          </>
        )}
      </div>
      )}

      {/* List of Days */}
      <div className="space-y-4">
        {dateStrings.map(dateStr => {
          const isToday = todayStr() === dateStr;
          // Weekend = Friday (5) & Saturday (6); the work week runs Sun–Thu.
          const isWeekend = isWeekendStr(dateStr);
          const status = getDayStatus(dateStr);
          const isExpanded = expandedDays[dateStr] !== false; // Default to expanded

          const morningShift = shifts.find(s => s.date === dateStr && s.type === 'Morning');
          const eveningShift = shifts.find(s => s.date === dateStr && s.type === 'Evening');
          const nightShift = shifts.find(s => s.date === dateStr && s.type === 'Night');

          const mConsultant = mConsultantDetails(morningShift?.consultantId);
          const eConsultant = eConsultantDetails(eveningShift?.consultantId);
          const nConsultant = nConsultantDetails(nightShift?.consultantId);

          return (
            <div
              key={dateStr}
              id={`day-card-${dateStr}`}
              className={`bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden transition-all duration-200 ${
                isToday ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              {/* Day Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low/40 transition-colors"
                onClick={() => toggleDayExpanded(dateStr)}
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-headline-sm text-headline-sm text-on-surface">
                    {formatDateLabel(dateStr)}
                    {isToday && (
                      <span className="ml-2 text-xs bg-primary text-on-primary font-bold px-2 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                  </h4>
                  {isWeekend && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-tertiary/10 text-tertiary border border-tertiary/20">
                      Weekend
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${status.color}`}
                  >
                    {status.label}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-outline" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-outline" />
                  )}
                </div>
              </div>

              {/* Day Shifts (Accordion Content) */}
              {isExpanded && (
                <div className="px-4 pb-4 divide-y divide-outline-variant/20">
                  {/* Morning Shift */}
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0">
                    <div className="flex items-start gap-4">
                      <div className="w-1 bg-secondary self-stretch rounded-full" />
                      <div>
                        <span className="text-label-caps text-secondary uppercase font-bold text-[11px] block">
                          Morning (08:00 - 16:00)
                        </span>
                        {mConsultant ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getConsultantColor(consultants, mConsultant.id).solid}`}>
                              {getInitials(mConsultant.name)}
                            </div>
                            <span className="text-body-md font-semibold text-on-surface">
                              {mConsultant.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-body-md text-outline italic mt-1 block">Unassigned</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div>
                        <select
                          value={morningShift?.consultantId || ''}
                          onChange={(e) => onUpdateShift(dateStr, 'Morning', e.target.value || null)}
                          className="bg-surface-container border-none text-xs rounded-lg px-3 py-1 font-medium text-on-surface focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="">Assign consultant...</option>
                          {consultants.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Evening Shift */}
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-1 bg-tertiary rounded-full self-stretch" />
                      <div>
                        <span className="text-label-caps text-tertiary uppercase font-bold text-[11px] block">
                          Evening (16:01 - 00:00)
                        </span>
                        {eConsultant ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getConsultantColor(consultants, eConsultant.id).solid}`}>
                              {getInitials(eConsultant.name)}
                            </div>
                            <span className="text-body-md font-semibold text-on-surface">
                              {eConsultant.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-body-md text-outline italic mt-1 block">Unassigned</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div>
                        <select
                          value={eveningShift?.consultantId || ''}
                          onChange={(e) => onUpdateShift(dateStr, 'Evening', e.target.value || null)}
                          className="bg-surface-container border-none text-xs rounded-lg px-3 py-1 font-medium text-on-surface focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="">Assign consultant...</option>
                          {consultants.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Night Shift */}
                  <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="w-1 bg-primary rounded-full self-stretch" />
                      <div>
                        <span className="text-label-caps text-primary uppercase font-bold text-[11px] block">
                          Night (00:01 - 07:59)
                        </span>
                        {nConsultant ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getConsultantColor(consultants, nConsultant.id).solid}`}>
                              {getInitials(nConsultant.name)}
                            </div>
                            <span className="text-body-md font-semibold text-on-surface">
                              {nConsultant.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-body-md text-outline italic mt-1 block">Unassigned</span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div>
                        <select
                          value={nightShift?.consultantId || ''}
                          onChange={(e) => onUpdateShift(dateStr, 'Night', e.target.value || null)}
                          className="bg-surface-container border-none text-xs rounded-lg px-3 py-1 font-medium text-on-surface focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="">Assign consultant...</option>
                          {consultants.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  function mConsultantDetails(id?: string | null) {
    if (!id) return null;
    return consultants.find(c => c.id === id) || null;
  }

  function eConsultantDetails(id?: string | null) {
    if (!id) return null;
    return consultants.find(c => c.id === id) || null;
  }

  function nConsultantDetails(id?: string | null) {
    if (!id) return null;
    return consultants.find(c => c.id === id) || null;
  }
}
