/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Consultant, Shift } from '../types';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import MonthlyGrid from './MonthlyGrid';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface RosterCalendarProps {
  currentYear: number;
  currentMonth: number; // 0-indexed
  consultants: Consultant[];
  shifts: Shift[];
}

// Read-only monthly roster. Browse the current and previous months with the
// arrows; nothing here is editable.
export default function RosterCalendar({ currentYear, currentMonth, consultants, shifts }: RosterCalendarProps) {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between bg-surface-container-lowest rounded-xl p-2 border border-outline-variant/20 shadow-sm">
        <button
          onClick={goPrev}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-primary hover:bg-surface-container-low active:scale-90 transition-all cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-primary" />
          <span className="font-headline-sm text-headline-sm text-on-surface">{MONTHS[month]} {year}</span>
        </div>
        <button
          onClick={goNext}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-primary hover:bg-surface-container-low active:scale-90 transition-all cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <MonthlyGrid
        currentYear={year}
        currentMonth={month}
        consultants={consultants}
        shifts={shifts}
        onSelectDate={() => {}}
        readOnly
      />

      <p className="text-center text-label-sm text-on-surface-variant">
        Read-only roster · use the arrows to view previous months.
      </p>
    </div>
  );
}
