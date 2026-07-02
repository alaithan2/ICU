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

export interface LeaveRequest {
  id: string;
  consultantId: string;
  consultantName: string;
  type: 'Annual Leave' | 'Sick Leave' | 'Study Leave' | 'Other';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}
