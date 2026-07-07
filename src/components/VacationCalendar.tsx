/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Consultant, LeaveRequest } from '../types';
import { ChevronLeft, ChevronRight, Palmtree } from 'lucide-react';
import { getConsultantColor, getInitials } from '../utils/consultantColors';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface VacationCalendarProps {
  currentYear: number;
  currentMonth: number; // 0-indexed
  consultants: Consultant[];
  leaves: LeaveRequest[];
}

const pad = (n: number) => String(n).padStart(2, '0');

// Month timeline of APPROVED leave. Each approved vacation is drawn as a bar
// spanning its start → end days within the selected month.
export default function VacationCalendar({ currentYear, currentMonth, consultants, leaves }: VacationCalendarProps) {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); }
  };
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); }
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const monthEnd = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

  // Approved leaves overlapping this month, earliest first.
  const approved = leaves
    .filter(l => l.status === 'Approved' && l.kind !== 'OnCall' && l.startDate <= monthEnd && l.endDate >= monthStart)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
          <Palmtree className="w-4 h-4 text-primary" />
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

      {approved.length === 0 ? (
        <div className="bg-surface-container-low p-8 rounded-xl border border-dashed border-outline-variant/30 text-center text-on-surface-variant space-y-2">
          <Palmtree className="w-10 h-10 text-outline mx-auto" />
          <p className="font-bold text-body-lg">No approved vacations</p>
          <p className="text-label-sm">There are no approved leave periods in {MONTHS[month]} {year}.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/20 shadow-sm space-y-4">
          {/* Day ruler */}
          <div
            className="grid text-[9px] text-outline font-semibold"
            style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: daysInMonth }).map((_, i) => (
              <div key={i} className="text-center">
                {i === 0 || (i + 1) % 5 === 0 ? i + 1 : ''}
              </div>
            ))}
          </div>

          {/* One bar per approved vacation */}
          <div className="space-y-3">
            {approved.map(leave => {
              const startDay = leave.startDate < monthStart ? 1 : Number(leave.startDate.slice(8, 10));
              const endDay = leave.endDate > monthEnd ? daysInMonth : Number(leave.endDate.slice(8, 10));
              const leftPct = ((startDay - 1) / daysInMonth) * 100;
              const widthPct = ((endDay - startDay + 1) / daysInMonth) * 100;
              const color = getConsultantColor(consultants, leave.consultantId);

              return (
                <div key={leave.id} className="space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${color.solid}`}>
                      {getInitials(leave.consultantName)}
                    </div>
                    <span className="text-body-md font-semibold text-on-surface truncate">{leave.consultantName}</span>
                    <span className="text-label-sm text-on-surface-variant shrink-0">
                      · {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </span>
                  </div>

                  {/* Timeline track with weekend shading + the vacation bar */}
                  <div className="relative h-7 rounded-lg bg-surface-container-low overflow-hidden border border-outline-variant/10">
                    <div
                      className="absolute inset-0 grid"
                      style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dow = new Date(year, month, i + 1).getDay();
                        const weekend = dow === 5 || dow === 6;
                        return <div key={i} className={weekend ? 'bg-tertiary/10' : ''} />;
                      })}
                    </div>
                    <div
                      className={`absolute top-1 bottom-1 rounded-md ${color.solid} shadow-sm`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${leave.consultantName}: ${leave.startDate} → ${leave.endDate}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-label-sm text-on-surface-variant">
            Weekend (Fri/Sat) columns are shaded. Only approved leave is shown.
          </p>
        </div>
      )}
    </div>
  );
}
