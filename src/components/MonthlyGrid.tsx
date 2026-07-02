/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Consultant, Shift, ShiftType } from '../types';
import { getConsultantColor, getInitials } from '../utils/consultantColors';

interface MonthlyGridProps {
  currentYear: number;
  currentMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  consultants: Consultant[];
  shifts: Shift[];
  onSelectDate: (dateStr: string) => void;
}

export default function MonthlyGrid({
  currentYear,
  currentMonth,
  consultants,
  shifts,
  onSelectDate
}: MonthlyGridProps) {
  // Get number of days in the current selected month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Standard Weekday Names (Sunday to Saturday, or Monday to Sunday? Let's use Sun-Sat)
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Total grid cells needed (empty cells + days of month)
  const totalCells = firstDayIndex + daysInMonth;
  const gridCells: (number | null)[] = [];

  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(d);
  }

  // Find shifts for a given day
  const getShiftsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      morning: shifts.find(s => s.date === dateStr && s.type === 'Morning'),
      evening: shifts.find(s => s.date === dateStr && s.type === 'Evening'),
      night: shifts.find(s => s.date === dateStr && s.type === 'Night')
    };
  };

  // Uppercase initials for a consultant id, or '--' when unassigned.
  const getConsultantAbbreviation = (id?: string | null) => {
    if (!id) return '--';
    const consultant = consultants.find(c => c.id === id);
    return consultant ? getInitials(consultant.name) : '--';
  };

  return (
    <div id="monthly-grid-view" className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/20 space-y-4">
      {/* Month header info */}
      <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
        <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          Monthly Grid Rota
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-medium text-outline">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> M
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary inline-block" /> E
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-on-primary-fixed-variant inline-block" /> N
          </div>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center font-bold text-outline text-[12px] pb-2 border-b border-outline-variant/10">
        {weekdays.map((day, idx) => (
          <div key={idx} className={`py-1 ${idx === 5 || idx === 6 ? 'text-tertiary' : ''}`}>{day}</div>
        ))}
      </div>

      {/* Calendar Cells Grid */}
      <div className="grid grid-cols-7 gap-2">
        {gridCells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-20 bg-surface-container-low/20 rounded-lg border border-transparent" />;
          }

          const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = new Date().toISOString().split('T')[0] === dayStr;
          // Column index within the 7-day row: 5 = Friday, 6 = Saturday (weekend).
          const isWeekend = idx % 7 === 5 || idx % 7 === 6;
          const dayShifts = getShiftsForDay(day);

          return (
            <div
              key={`day-${day}`}
              id={`calendar-cell-${dayStr}`}
              onClick={() => onSelectDate(dayStr)}
              className={`h-24 p-1 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-150 hover:bg-surface-container-low/60 active:scale-95 ${
                isToday
                  ? 'bg-primary/5 border-primary/50 ring-1 ring-primary/20'
                  : isWeekend
                    ? 'bg-tertiary/5 border-outline-variant/10'
                    : 'bg-surface-container-lowest border-outline-variant/10'
              }`}
            >
              {/* Day Top Bar */}
              <div className="flex items-center justify-between">
                <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-full ${
                  isToday ? 'bg-primary text-on-primary' : 'text-on-surface'
                }`}>
                  {day}
                </span>
              </div>

              {/* Day Shifts Dots / Mini Labels */}
              <div className="flex flex-col gap-0.5 mt-auto">
                {/* Morning Shift */}
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block shrink-0" />
                  <span className={`text-[9px] font-bold truncate px-0.5 py-px rounded border leading-none ${getConsultantColor(consultants, dayShifts.morning?.consultantId).soft}`}>
                    {getConsultantAbbreviation(dayShifts.morning?.consultantId)}
                  </span>
                </div>

                {/* Evening Shift */}
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary inline-block shrink-0" />
                  <span className={`text-[9px] font-bold truncate px-0.5 py-px rounded border leading-none ${getConsultantColor(consultants, dayShifts.evening?.consultantId).soft}`}>
                    {getConsultantAbbreviation(dayShifts.evening?.consultantId)}
                  </span>
                </div>

                {/* Night Shift */}
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-primary-fixed-variant inline-block shrink-0" />
                  <span className={`text-[9px] font-bold truncate px-0.5 py-px rounded border leading-none ${getConsultantColor(consultants, dayShifts.night?.consultantId).soft}`}>
                    {getConsultantAbbreviation(dayShifts.night?.consultantId)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
