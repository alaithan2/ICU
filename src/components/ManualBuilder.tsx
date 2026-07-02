/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Consultant, Shift, ShiftType } from '../types';
import { Calendar, User, Info, Check } from 'lucide-react';

interface ManualBuilderProps {
  consultants: Consultant[];
  shifts: Shift[];
  initialSelectedDate?: string;
  onUpdateShift: (date: string, type: ShiftType, consultantId: string | null) => void;
}

export default function ManualBuilder({
  consultants,
  shifts,
  initialSelectedDate,
  onUpdateShift
}: ManualBuilderProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialSelectedDate || new Date().toISOString().split('T')[0]
  );
  const [selectedType, setSelectedType] = useState<ShiftType>('Morning');
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Update selected consultant when date or shift type changes
  useEffect(() => {
    const existingShift = shifts.find(s => s.date === selectedDate && s.type === selectedType);
    setSelectedConsultantId(existingShift?.consultantId || '');
  }, [selectedDate, selectedType, shifts]);

  // Handle prop change
  useEffect(() => {
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate);
    }
  }, [initialSelectedDate]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateShift(selectedDate, selectedType, selectedConsultantId || null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const currentAssignedConsultant = consultants.find(c => c.id === selectedConsultantId);

  return (
    <div id="manual-builder-view" className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/20 space-y-4">
      <div className="border-b border-outline-variant/10 pb-3">
        <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
          Manual Shift Builder
        </h3>
        <p className="text-label-sm text-on-surface-variant font-medium mt-1">
          Precisely override or allocate specific consultant shift positions.
        </p>
      </div>

      <form onSubmit={handleApply} className="space-y-4">
        {/* Date Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
            <Calendar className="w-4 h-4 text-primary" /> Target Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full"
            required
          />
        </div>

        {/* Shift Type Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px]">
            Shift Rotation Slot
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Morning', 'Evening', 'Night'] as ShiftType[]).map((type) => {
              const colors: Record<ShiftType, string> = {
                Morning: 'peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:border-primary',
                Evening: 'peer-checked:bg-tertiary/10 peer-checked:text-tertiary peer-checked:border-tertiary',
                Night: 'peer-checked:bg-on-primary-fixed-variant/10 peer-checked:text-on-primary-fixed-variant peer-checked:border-on-primary-fixed-variant',
              };

              return (
                <label key={type} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="shiftType"
                    value={type}
                    checked={selectedType === type}
                    onChange={() => setSelectedType(type)}
                    className="sr-only peer"
                  />
                  <div className={`text-center py-3 border-2 border-outline-variant/30 rounded-xl font-semibold text-body-md text-on-surface-variant peer-checked:font-bold hover:bg-surface-container transition-all ${colors[type]}`}>
                    {type}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Consultant Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-label-caps text-on-surface-variant uppercase font-bold text-[11px] flex items-center gap-1">
            <User className="w-4 h-4 text-primary" /> Assign Consultant
          </label>
          <select
            value={selectedConsultantId}
            onChange={(e) => setSelectedConsultantId(e.target.value)}
            className="bg-surface-container border-none text-body-md rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary outline-none cursor-pointer w-full font-medium"
          >
            <option value="">-- Unassigned (Empty Shift) --</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.role})
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Info Status */}
        {currentAssignedConsultant && (
          <div className="bg-surface-container-low border border-outline-variant/10 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div>
              <p className="text-body-md font-semibold text-on-surface">Allocation Status</p>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                {currentAssignedConsultant.name} will be scheduled for the {selectedType} Shift on {selectedDate}.
              </p>
            </div>
          </div>
        )}

        {/* Apply Button */}
        <button
          type="submit"
          className="w-full h-12 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {savedSuccess ? (
            <>
              <Check className="w-5 h-5" /> Saved Assignment!
            </>
          ) : (
            'Apply Allocation'
          )}
        </button>
      </form>
    </div>
  );
}
