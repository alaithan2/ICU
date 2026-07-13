/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Consultant, LeaveRequest, LeaveType, RequestKind, ShiftPreference } from '../types';
import {
  Palmtree, Activity, HelpCircle, Calendar, Send, Check, X, FileText, Inbox,
  Trash2, Pencil, CalendarClock
} from 'lucide-react';
import { getConsultantColor, getInitials } from '../utils/consultantColors';
import { todayStr } from '../utils/dates';

interface LeaveRequestsProps {
  currentYear: number;
  currentMonth: number; // 0-indexed
  consultants: Consultant[];
  leaves: LeaveRequest[];
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onSubmitLeave: (
    consultantId: string,
    consultantName: string,
    type: LeaveType,
    startDate: string,
    endDate: string,
    reason: string,
    kind: RequestKind,
    shift?: ShiftPreference
  ) => void;
  onUpdateLeave: (request: LeaveRequest) => void;
  onDeleteLeave: (id: string) => void;
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
}

type SubTab = 'List' | 'SubmitNew';

const SHIFT_OPTIONS: ShiftPreference[] = ['Any', 'Morning', 'Evening', 'Night'];

export default function LeaveRequests({
  consultants,
  leaves,
  onApproveLeave,
  onRejectLeave,
  onSubmitLeave,
  onUpdateLeave,
  onDeleteLeave,
  isAdmin,
  currentUserId,
  currentUserName,
  currentUserEmail
}: LeaveRequestsProps) {
  const [subTab, setSubTab] = useState<SubTab>('List');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Request kind: a leave period, or a preferred on-call date.
  const [requestKind, setRequestKind] = useState<RequestKind>('Leave');

  // Shared / leave fields
  const [leaveConsultantId, setLeaveConsultantId] = useState<string>(
    consultants.find(c => c.active)?.id || consultants[0]?.id || ''
  );
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual Leave');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // On-call fields (a preferred period)
  const [onCallStart, setOnCallStart] = useState<string>('');
  const [onCallEnd, setOnCallEnd] = useState<string>('');
  const [onCallShift, setOnCallShift] = useState<ShiftPreference>('Any');

  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const today = todayStr();

  // Reversed ranges (end before start) yield 0, not a misleading positive count.
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) || diffDays < 1 ? 0 : diffDays;
  };

  const resetForm = () => {
    setEditingId(null);
    setRequestKind('Leave');
    setLeaveType('Annual Leave');
    setStartDate('');
    setEndDate('');
    setReason('');
    setOnCallStart('');
    setOnCallEnd('');
    setOnCallShift('Any');
  };

  const startEdit = (req: LeaveRequest) => {
    setEditingId(req.id);
    setRequestKind(req.kind === 'OnCall' ? 'OnCall' : 'Leave');
    setLeaveConsultantId(req.consultantId);
    setLeaveType(req.type);
    setReason(req.reason || '');
    if (req.kind === 'OnCall') {
      setOnCallStart(req.startDate);
      setOnCallEnd(req.endDate);
      setOnCallShift(req.shift ?? 'Any');
    } else {
      setStartDate(req.startDate);
      setEndDate(req.endDate);
    }
    setSubTab('SubmitNew');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (requestKind === 'Leave' && (!startDate || !endDate)) return;
    if (requestKind === 'OnCall' && (!onCallStart || !onCallEnd)) return;

    // Guard against reversed ranges (the end-date input's `min` also blocks this
    // in most browsers, but validate on submit to be safe).
    if (requestKind === 'Leave' && endDate < startDate) {
      alert('The end date cannot be before the start date.');
      return;
    }
    if (requestKind === 'OnCall' && onCallEnd < onCallStart) {
      alert('The "to" date cannot be before the "from" date.');
      return;
    }

    const editing = editingId ? leaves.find(l => l.id === editingId) : null;

    // Identity: keep the original when editing; otherwise admin picks a
    // consultant, and regular users file under the consultant profile linked to
    // their sign-in (so analytics/vacation views attribute the leave), falling
    // back to their raw account if no profile is linked yet.
    let cid: string;
    let cname: string;
    if (editing) {
      cid = editing.consultantId;
      cname = editing.consultantName;
    } else if (isAdmin) {
      if (!leaveConsultantId) return;
      const c = consultants.find(x => x.id === leaveConsultantId);
      cid = leaveConsultantId;
      cname = c ? c.name : 'Unknown';
    } else {
      const mine = currentUserEmail
        ? consultants.find(c => c.userEmail && c.userEmail.toLowerCase() === currentUserEmail.toLowerCase())
        : undefined;
      cid = mine ? mine.id : currentUserId;
      cname = mine ? mine.name : currentUserName;
    }

    const type: LeaveType = requestKind === 'OnCall' ? 'Other' : leaveType;
    const start = requestKind === 'OnCall' ? onCallStart : startDate;
    const end = requestKind === 'OnCall' ? onCallEnd : endDate;

    if (editing) {
      // Spread the original first so submitter/ownership fields are preserved.
      const updated: LeaveRequest = {
        ...editing,
        consultantId: cid,
        consultantName: cname,
        type,
        startDate: start,
        endDate: end,
        reason,
        kind: requestKind
      };
      if (requestKind === 'OnCall') updated.shift = onCallShift;
      else delete updated.shift;
      onUpdateLeave(updated);
    } else {
      onSubmitLeave(cid, cname, type, start, end, reason, requestKind, requestKind === 'OnCall' ? onCallShift : undefined);
    }

    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      resetForm();
      setSubTab('List');
    }, 1200);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isOnCall = (req: LeaveRequest) => req.kind === 'OnCall';

  const summaryLine = (req: LeaveRequest) => {
    if (isOnCall(req)) {
      const shift = req.shift && req.shift !== 'Any' ? ` · ${req.shift}` : '';
      const period =
        req.startDate === req.endDate
          ? formatDate(req.startDate)
          : `${formatDate(req.startDate)} — ${formatDate(req.endDate)}`;
      return `On-call: ${period}${shift}`;
    }
    return `${req.type} · ${formatDate(req.startDate)} — ${formatDate(req.endDate)}`;
  };

  const statusBadge = (status: LeaveRequest['status']) => {
    if (status === 'Approved') return 'text-secondary bg-secondary-fixed/40 border-secondary/20';
    if (status === 'Rejected') return 'text-error bg-error-container/40 border-error/20';
    return 'text-tertiary bg-tertiary-fixed/40 border-tertiary/20';
  };

  // The consultant profile linked to the signed-in member, if any.
  const myConsultantId = currentUserEmail
    ? consultants.find(c => c.userEmail && c.userEmail.toLowerCase() === currentUserEmail.toLowerCase())?.id
    : undefined;

  // A request "belongs" to the member if they submitted it, if it's filed under
  // their raw account (legacy), or if it's about their linked consultant profile.
  const isMine = (r: LeaveRequest) =>
    r.submittedByUid === currentUserId ||
    r.consultantId === currentUserId ||
    (!!myConsultantId && r.consultantId === myConsultantId);

  // They can only cancel/edit requests they actually submitted (matches the
  // Firestore rules, which key ownership off submittedByUid / legacy uid).
  const canModify = (r: LeaveRequest) =>
    r.submittedByUid === currentUserId || r.consultantId === currentUserId;

  // Admins see every request; regular users only their own.
  const visibleLeaves = isAdmin ? leaves : leaves.filter(isMine);
  const pendingRequests = visibleLeaves.filter(r => r.status === 'Pending');
  const pastRequests = visibleLeaves.filter(r => r.status !== 'Pending');

  // ---- Reusable pieces ----
  const KindBadge = ({ req }: { req: LeaveRequest }) =>
    isOnCall(req) ? (
      <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
        On-Call
      </span>
    ) : (
      <span className="text-[11px] font-bold text-tertiary bg-tertiary-fixed/40 border border-tertiary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
        {req.type}
      </span>
    );

  const Avatar = ({ req }: { req: LeaveRequest }) => (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getConsultantColor(consultants, req.consultantId).solid}`}>
      {getInitials(req.consultantName)}
    </div>
  );

  const AdminActions = ({ req }: { req: LeaveRequest }) => (
    <div className="flex items-center gap-1 shrink-0">
      {req.status !== 'Approved' && (
        <button
          onClick={() => onApproveLeave(req.id)}
          title="Approve"
          className="p-2 rounded-lg text-secondary hover:bg-secondary/10 active:scale-90 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
      {req.status !== 'Rejected' && (
        <button
          onClick={() => onRejectLeave(req.id)}
          title="Reject"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high active:scale-90 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={() => startEdit(req)}
        title="Edit"
        className="p-2 rounded-lg text-primary hover:bg-primary/10 active:scale-90 transition-all cursor-pointer"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          if (window.confirm('Delete this request permanently?')) onDeleteLeave(req.id);
        }}
        title="Delete"
        className="p-2 rounded-lg text-error/80 hover:bg-error-container/30 active:scale-90 transition-all cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const renderAdminCard = (req: LeaveRequest) => (
    <div key={req.id} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <Avatar req={req} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">{req.consultantName}</h4>
            <KindBadge req={req} />
          </div>
          <p className="text-label-sm text-on-surface-variant font-medium mt-0.5">{summaryLine(req)}</p>
        </div>
      </div>

      {req.reason && (
        <div className="bg-surface-container-low p-3 rounded-lg text-body-md text-on-surface-variant border border-outline-variant/5">
          <span className="font-bold text-on-surface text-xs block mb-0.5">REASON:</span>
          "{req.reason}"
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${statusBadge(req.status)}`}>
          {req.status}
        </span>
        <AdminActions req={req} />
      </div>
    </div>
  );

  return (
    <div id="leave-requests-view" className="space-y-6">
      {/* View Selector Header */}
      <div className="bg-surface-container rounded-xl p-1 flex">
        <button
          onClick={() => setSubTab('List')}
          className={`flex-1 py-3 text-center rounded-lg font-bold text-body-md transition-all cursor-pointer ${
            subTab === 'List' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {isAdmin ? `Pending (${pendingRequests.length})` : `My Requests (${visibleLeaves.length})`}
        </button>
        <button
          onClick={() => { resetForm(); setSubTab('SubmitNew'); }}
          className={`flex-1 py-3 text-center rounded-lg font-bold text-body-md transition-all cursor-pointer ${
            subTab === 'SubmitNew' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {editingId ? 'Editing…' : 'Submit New'}
        </button>
      </div>

      {subTab === 'List' ? (
        isAdmin ? (
          /* ---------------- ADMIN: queue + processed ---------------- */
          <div className="space-y-4">
            <div className="px-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Request Queue</h3>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                Approve, reject, edit or delete leave and on-call requests.
              </p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="bg-surface-container-low p-8 rounded-xl border border-dashed border-outline-variant/30 text-center text-on-surface-variant space-y-2">
                <Check className="w-10 h-10 text-secondary mx-auto" />
                <p className="font-bold text-body-lg">All caught up!</p>
                <p className="text-label-sm">No pending requests require your action.</p>
              </div>
            ) : (
              pendingRequests.map(req => renderAdminCard(req))
            )}

            {pastRequests.length > 0 && (
              <div className="pt-4 space-y-3">
                <h4 className="px-1 text-label-caps text-on-surface-variant uppercase font-bold text-[11px] tracking-wider">
                  Processed Requests
                </h4>
                {pastRequests.map(req => renderAdminCard(req))}
              </div>
            )}
          </div>
        ) : (
          /* ---------------- USER: my requests ---------------- */
          <div className="space-y-4">
            <div className="px-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">My Requests</h3>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                Track the status of your leave and on-call requests.
              </p>
            </div>

            {visibleLeaves.length === 0 ? (
              <div className="bg-surface-container-low p-8 rounded-xl border border-dashed border-outline-variant/30 text-center text-on-surface-variant space-y-2">
                <Inbox className="w-10 h-10 text-outline mx-auto" />
                <p className="font-bold text-body-lg">No requests yet</p>
                <p className="text-label-sm">Tap “Submit New” to request leave or an on-call date.</p>
              </div>
            ) : (
              visibleLeaves.map(req => (
                <div key={req.id} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <KindBadge req={req} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${statusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-body-md font-semibold text-on-surface">{summaryLine(req)}</p>
                  {req.reason && <p className="text-label-sm text-on-surface-variant italic">"{req.reason}"</p>}
                  {req.status === 'Pending' && (
                    <div className="flex items-center justify-between">
                      <p className="text-label-sm text-on-surface-variant">Awaiting administrator approval.</p>
                      {canModify(req) && (
                        <button
                          onClick={() => { if (window.confirm('Cancel this request?')) onDeleteLeave(req.id); }}
                          className="text-label-sm text-error font-semibold hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                  {req.status === 'Approved' && <p className="text-label-sm text-secondary font-semibold">✓ Approved by the administrator.</p>}
                  {req.status === 'Rejected' && <p className="text-label-sm text-error font-semibold">✕ This request was declined.</p>}
                </div>
              ))
            )}
          </div>
        )
      ) : (
        /* ---------------- Submit / Edit form ---------------- */
        <form onSubmit={handleSubmit} className="space-y-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-sm">
          <div className="border-b border-outline-variant/10 pb-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              {editingId ? 'Edit Request' : 'New Request'}
            </h3>
            <p className="text-label-sm text-on-surface-variant font-medium mt-1">
              {requestKind === 'OnCall'
                ? 'Ask to be on-call on a specific future date.'
                : 'Plan your time off for the upcoming roster cycle.'}
            </p>
          </div>

          {/* Request kind toggle */}
          <div className="bg-surface-container rounded-xl p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setRequestKind('Leave')}
              className={`py-2.5 rounded-lg font-bold text-body-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                requestKind === 'Leave' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <Palmtree className="w-4 h-4" /> Leave
            </button>
            <button
              type="button"
              onClick={() => setRequestKind('OnCall')}
              className={`py-2.5 rounded-lg font-bold text-body-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                requestKind === 'OnCall' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <CalendarClock className="w-4 h-4" /> On-Call
            </button>
          </div>

          {/* Identity: consultant picker (admin, new) or self banner */}
          {editingId ? (
            <div className="bg-surface-container-low rounded-xl p-3 text-label-sm text-on-surface-variant border border-outline-variant/10">
              Editing request for <span className="font-semibold text-on-surface">{leaves.find(l => l.id === editingId)?.consultantName}</span>
            </div>
          ) : isAdmin ? (
            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px]">Consultant Profile</label>
              <select
                value={leaveConsultantId}
                onChange={(e) => setLeaveConsultantId(e.target.value)}
                className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full font-semibold"
                required
              >
                {consultants.filter(c => c.active).length === 0 && <option value="">No active consultants — add some in Settings</option>}
                {consultants.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl p-3 flex items-center gap-3 border border-outline-variant/10">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {getInitials(currentUserName)}
              </div>
              <div className="min-w-0">
                <p className="text-label-sm text-on-surface-variant">Requesting as</p>
                <p className="text-body-md font-semibold text-on-surface truncate">{currentUserName}</p>
              </div>
            </div>
          )}

          {requestKind === 'Leave' ? (
            <>
              {/* Leave Type Grid (Study Leave removed) */}
              <div className="flex flex-col gap-2">
                <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px]">Leave Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'Annual Leave', label: 'Annual Leave', icon: Palmtree, color: 'text-primary border-primary bg-primary/5' },
                    { type: 'Sick Leave', label: 'Sick Leave', icon: Activity, color: 'text-emerald-600 border-emerald-500 bg-emerald-500/5' },
                    { type: 'Other', label: 'Other Type', icon: HelpCircle, color: 'text-amber-600 border-amber-500 bg-amber-500/5' }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = leaveType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setLeaveType(item.type as LeaveType)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-95 text-left ${
                          isSelected ? item.color + ' font-bold' : 'border-outline-variant/30 text-on-surface-variant font-medium hover:border-outline-variant'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-body-md">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start / End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Start Date
                  </label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                    className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> End Date
                  </label>
                  <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} required
                    className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full" />
                </div>
              </div>

              {startDate && endDate && (
                <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-between text-body-md border border-outline-variant/5">
                  <span className="text-on-surface-variant">Duration:</span>
                  <span className="font-bold text-primary">{calculateDays()} Days</span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* On-call preferred period + shift */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5 text-primary" /> From
                  </label>
                  <input type="date" value={onCallStart} min={today} onChange={(e) => setOnCallStart(e.target.value)} required
                    className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5 text-primary" /> To
                  </label>
                  <input type="date" value={onCallEnd} min={onCallStart || today} onChange={(e) => setOnCallEnd(e.target.value)} required
                    className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px]">Preferred Shift</label>
                <div className="grid grid-cols-4 gap-2">
                  {SHIFT_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setOnCallShift(s)}
                      className={`py-2.5 rounded-xl border-2 text-body-md font-semibold transition-all active:scale-95 ${
                        onCallShift === s ? 'border-primary text-primary bg-primary/5' : 'border-outline-variant/30 text-on-surface-variant hover:border-outline-variant'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-primary" /> Reason / Notes (Optional)
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Provide details for your request..."
              className="w-full bg-surface-container border border-transparent rounded-xl p-4 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-outline text-on-surface resize-none" />
          </div>

          <button
            type="submit"
            className="w-full h-14 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitSuccess ? (
              <><Check className="w-5 h-5" /> Saved!</>
            ) : editingId ? (
              <>Save Changes <Check className="w-4 h-4" /></>
            ) : (
              <>Submit Request <Send className="w-4 h-4" /></>
            )}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => { resetForm(); setSubTab('List'); }}
              className="w-full text-center text-label-sm text-on-surface-variant font-semibold hover:text-on-surface cursor-pointer"
            >
              Cancel editing
            </button>
          )}
        </form>
      )}
    </div>
  );
}
