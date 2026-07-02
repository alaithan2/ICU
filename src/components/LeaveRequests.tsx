/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Consultant, LeaveRequest } from '../types';
import { Palmtree, GraduationCap, Activity, HelpCircle, Calendar, Send, Check, X, FileText } from 'lucide-react';

interface LeaveRequestsProps {
  currentYear: number;
  currentMonth: number; // 0-indexed
  consultants: Consultant[];
  leaves: LeaveRequest[];
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onSubmitLeave: (consultantId: string, type: 'Annual Leave' | 'Sick Leave' | 'Study Leave' | 'Other', startDate: string, endDate: string, reason: string) => void;
}

type SubTab = 'Pending' | 'SubmitNew';

export default function LeaveRequests({
  currentYear,
  currentMonth,
  consultants,
  leaves,
  onApproveLeave,
  onRejectLeave,
  onSubmitLeave
}: LeaveRequestsProps) {
  const [subTab, setSubTab] = useState<SubTab>('Pending');

  // Submit Leave State
  const [leaveConsultantId, setLeaveConsultantId] = useState<string>(consultants[0]?.id || '');
  const [leaveType, setLeaveType] = useState<'Annual Leave' | 'Sick Leave' | 'Study Leave' | 'Other'>('Annual Leave');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Simple date range calculation
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diffDays) ? 0 : diffDays;
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveConsultantId || !startDate || !endDate) return;

    onSubmitLeave(leaveConsultantId, leaveType, startDate, endDate, reason);
    setSubmitSuccess(true);
    setStartDate('');
    setEndDate('');
    setReason('');
    setTimeout(() => {
      setSubmitSuccess(false);
      setSubTab('Pending');
    }, 1500);
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter leave requests
  const pendingRequests = leaves.filter(r => r.status === 'Pending');
  const pastRequests = leaves.filter(r => r.status !== 'Pending');

  return (
    <div id="leave-requests-view" className="space-y-6">
      {/* View Selector Header */}
      <div className="bg-surface-container rounded-xl p-1 flex">
        <button
          onClick={() => setSubTab('Pending')}
          className={`flex-1 py-3 text-center rounded-lg font-bold text-body-md transition-all cursor-pointer ${
            subTab === 'Pending'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Pending Requests ({pendingRequests.length})
        </button>
        <button
          onClick={() => setSubTab('SubmitNew')}
          className={`flex-1 py-3 text-center rounded-lg font-bold text-body-md transition-all cursor-pointer ${
            subTab === 'SubmitNew'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Submit New
        </button>
      </div>

      {subTab === 'Pending' ? (
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Leave Approval Queue</h3>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              Review and act on pending consultant holiday requests.
            </p>
          </div>

          {/* Pending Queue */}
          {pendingRequests.length === 0 ? (
            <div className="bg-surface-container-low p-8 rounded-xl border border-dashed border-outline-variant/30 text-center text-on-surface-variant space-y-2">
              <Check className="w-10 h-10 text-secondary mx-auto" />
              <p className="font-bold text-body-lg">All caught up!</p>
              <p className="text-label-sm">No pending leave requests require your action.</p>
            </div>
          ) : (
            pendingRequests.map(req => {
              const consultant = consultants.find(c => c.id === req.consultantId);
              return (
                <div
                  key={req.id}
                  id={`leave-card-${req.id}`}
                  className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={consultant?.avatar}
                      alt={req.consultantName}
                      className="w-12 h-12 rounded-full object-cover border border-outline-variant/20"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-headline-sm text-headline-sm text-on-surface">{req.consultantName}</h4>
                        <span className="text-[11px] font-bold text-tertiary bg-tertiary-fixed/40 border border-tertiary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {req.type}
                        </span>
                      </div>
                      <p className="text-label-sm text-on-surface-variant font-medium mt-0.5">
                        {formatDateLabel(req.startDate)} — {formatDateLabel(req.endDate)}
                      </p>
                    </div>
                  </div>

                  {req.reason && (
                    <div className="bg-surface-container-low p-3 rounded-lg text-body-md text-on-surface-variant border border-outline-variant/5">
                      <span className="font-bold text-on-surface text-xs block mb-0.5">REASON:</span>
                      "{req.reason}"
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onApproveLeave(req.id)}
                      className="py-3 bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container rounded-xl font-bold text-body-md active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-secondary/15"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => onRejectLeave(req.id)}
                      className="py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-xl font-bold text-body-md active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Past Approvals / Denials History */}
          {pastRequests.length > 0 && (
            <div className="pt-4 space-y-3">
              <h4 className="px-1 text-label-caps text-on-surface-variant uppercase font-bold text-[11px] tracking-wider">
                Processed Requests History
              </h4>
              <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-inner border border-outline-variant/10 divide-y divide-outline-variant/20">
                {pastRequests.map(req => (
                  <div key={req.id} className="p-3 flex items-center justify-between gap-4 hover:bg-surface-container-high/40 transition-colors">
                    <div>
                      <p className="font-semibold text-body-md text-on-surface">{req.consultantName}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {req.type} • {formatDateLabel(req.startDate)} — {formatDateLabel(req.endDate)}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                          req.status === 'Approved'
                            ? 'text-secondary bg-secondary-fixed/40 border-secondary/20'
                            : 'text-error bg-error-container/40 border-error/20'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Submit New Request form */
        <form onSubmit={handleCreateRequest} className="space-y-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 shadow-sm">
          <div className="border-b border-outline-variant/10 pb-3">
            <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
              New Vacation Entry
            </h3>
            <p className="text-label-sm text-on-surface-variant font-medium mt-1">
              Plan your time off for the upcoming roster cycle.
            </p>
          </div>

          {/* Consultant Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px]">
              Consultant Profile
            </label>
            <select
              value={leaveConsultantId}
              onChange={(e) => setLeaveConsultantId(e.target.value)}
              className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full font-semibold"
              required
            >
              {consultants.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>

          {/* Leave Type Grid */}
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px]">
              Leave Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'Annual Leave', label: 'Annual Leave', icon: Palmtree, color: 'text-primary border-primary bg-primary/5' },
                { type: 'Sick Leave', label: 'Sick Leave', icon: Activity, color: 'text-emerald-600 border-emerald-500 bg-emerald-500/5' },
                { type: 'Study Leave', label: 'Study Leave', icon: GraduationCap, color: 'text-indigo-600 border-indigo-500 bg-indigo-500/5' },
                { type: 'Other', label: 'Other Type', icon: HelpCircle, color: 'text-amber-600 border-amber-500 bg-amber-500/5' }
              ].map(item => {
                const Icon = item.icon;
                const isSelected = leaveType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setLeaveType(item.type as any)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-95 text-left ${
                      isSelected
                        ? item.color + ' font-bold'
                        : 'border-outline-variant/30 text-on-surface-variant font-medium hover:border-outline-variant'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-body-md">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start and End Date Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full"
                required
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-between text-body-md border border-outline-variant/5">
              <span className="text-on-surface-variant">Duration:</span>
              <span className="font-bold text-primary">{calculateDays()} Days</span>
            </div>
          )}

          {/* Reason text */}
          <div className="flex flex-col gap-2">
            <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-primary" /> Reason / Notes (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide details about your leave request..."
              rows={3}
              className="w-full bg-surface-container border border-transparent rounded-xl p-4 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-outline text-on-surface resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-14 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/25 hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitSuccess ? (
              <>
                <Check className="w-5 h-5" /> Submitted Successfully!
              </>
            ) : (
              <>
                Submit Request <Send className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-label-sm text-on-surface-variant mt-3 px-4">
            This request will be logged into the leave queue for review and approval by the Clinical Department Head.
          </p>
        </form>
      )}
    </div>
  );
}
