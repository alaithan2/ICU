/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Consultant {
  id: string;
  name: string;
  role: string;
  avatar: string;
  active: boolean;
}

export type ShiftType = 'Morning' | 'Evening' | 'Night';

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
  consultantId: string | null;
}

export type LeaveType = 'Annual Leave' | 'Sick Leave' | 'Other';
export type RequestKind = 'Leave' | 'OnCall';
export type ShiftPreference = ShiftType | 'Any';

export interface LeaveRequest {
  id: string;
  consultantId: string;
  consultantName: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  kind?: RequestKind; // 'Leave' (default) or 'OnCall' preference
  shift?: ShiftPreference; // requested shift for on-call preferences
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}
