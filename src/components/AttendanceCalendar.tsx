'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar as CalendarIcon,
  Trash2,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: 'working' | 'leave_by_school' | 'leave_by_office' | 'leave_taken' | 'half_day';
  note?: string;
}

interface AttendanceCalendarProps {
  type: 'school' | 'office';
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  records: AttendanceRecord[];
  onSaveStatus: (date: string, status: string, note?: string) => Promise<void>;
  readOnly?: boolean;
  monthlySalary?: number;
  paidLeavesDays?: number;
  perLeaveCut?: number;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  type,
  currentMonth,
  onMonthChange,
  records,
  onSaveStatus,
  readOnly = false,
  monthlySalary = 0,
  paidLeavesDays = 0,
  perLeaveCut = 0,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedNote, setSelectedNote] = useState('');
  const [saving, setSaving] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Map of date string to record
  const recordsMap = new Map<string, AttendanceRecord>();
  records.forEach(r => recordsMap.set(r.date, r));

  // Compute monthly totals
  let workingCount = 0;
  let leaveByOrgCount = 0;
  let leaveTakenCount = 0;
  let halfDayCount = 0;

  records.forEach(r => {
    if (r.status === 'working') workingCount++;
    else if (r.status === 'leave_by_school' || r.status === 'leave_by_office') leaveByOrgCount++;
    else if (r.status === 'leave_taken') leaveTakenCount++;
    else if (r.status === 'half_day') halfDayCount++;
  });

  const effectiveWorkingDays = workingCount + (halfDayCount * 0.5);
  const effectiveLeavesTaken = leaveTakenCount + (halfDayCount * 0.5);

  // Salary cut calculations
  const salary = Number(monthlySalary || 0);
  const allowedPaidLeaves = Number(paidLeavesDays || 0);
  const leaveCutRate = Number(perLeaveCut) > 0 ? Number(perLeaveCut) : (salary > 0 ? Math.round(salary / 30) : 0);
  const unpaidLeaves = Math.max(0, effectiveLeavesTaken - allowedPaidLeaves);
  const totalSalaryCut = Math.round(unpaidLeaves * leaveCutRate);
  const netEstimatedSalary = Math.max(0, salary - totalSalaryCut);

  const orgLeaveLabel = type === 'school' ? 'Leave by School' : 'Leave by Office';
  const orgLeaveStatusKey = type === 'school' ? 'leave_by_school' : 'leave_by_office';

  const handleDayClick = (day: Date) => {
    if (readOnly) return;
    setSelectedDate(day);
    const dateStr = format(day, 'yyyy-MM-dd');
    const existing = recordsMap.get(dateStr);
    setSelectedNote(existing?.note || '');
  };

  const handleSetStatus = async (status: string) => {
    if (!selectedDate) return;
    setSaving(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      await onSaveStatus(dateStr, status, selectedNote);
      setSelectedDate(null);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (status === 'working') {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200 ring-2 ring-emerald-100" />
      );
    }
    if (status === 'half_day') {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-200 ring-2 ring-orange-100" />
      );
    }
    if (status === 'leave_by_school' || status === 'leave_by_office') {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-200 ring-2 ring-amber-100" />
      );
    }
    if (status === 'leave_taken') {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200 ring-2 ring-rose-100" />
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Monthly Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Working Days Card */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                Working Days
              </span>
              <h4 className="text-xl font-black text-emerald-700">{effectiveWorkingDays} d</h4>
              <p className="text-[10px] text-slate-400 font-medium">{workingCount} full + {halfDayCount} half</p>
            </div>
          </div>
          <span className="text-lg">🟢</span>
        </div>

        {/* Half Day Card */}
        <div className="p-4 rounded-2xl bg-white border border-orange-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <span className="text-sm font-black">½</span>
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                Half Days
              </span>
              <h4 className="text-xl font-black text-orange-600">{halfDayCount} Days</h4>
              <p className="text-[10px] text-slate-400 font-medium">0.5 work + 0.5 leave</p>
            </div>
          </div>
          <span className="text-lg">🟠</span>
        </div>

        {/* Leave by Org Card */}
        <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                {orgLeaveLabel}
              </span>
              <h4 className="text-xl font-black text-amber-600">{leaveByOrgCount} Days</h4>
              <p className="text-[10px] text-slate-400 font-medium">Official holidays</p>
            </div>
          </div>
          <span className="text-lg">🟡</span>
        </div>

        {/* Leave Taken Card */}
        <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                Leaves Taken
              </span>
              <h4 className="text-xl font-black text-rose-600">{effectiveLeavesTaken} d</h4>
              <p className="text-[10px] text-slate-400 font-medium">{leaveTakenCount} full + {halfDayCount} half</p>
            </div>
          </div>
          <span className="text-lg">🔴</span>
        </div>
      </div>

      {/* Salary & Leave Deduction Calculation Strip */}
      {(salary > 0 || allowedPaidLeaves > 0 || perLeaveCut > 0) && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/50 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                Salary & Leave Deduction Summary
              </span>
              <span className="text-xs text-slate-400 font-medium">({format(currentMonth, 'MMMM yyyy')})</span>
            </div>
            <div className="text-xs text-indigo-200">
              Paid Leaves Allowed: <span className="font-extrabold text-white bg-indigo-800/80 px-2 py-0.5 rounded-lg">{allowedPaidLeaves} Days</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Base Salary</span>
              <span className="text-lg font-bold text-white block mt-0.5">₹{salary.toLocaleString('en-IN')}</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Leaves Taken</span>
              <span className="text-lg font-bold text-amber-300 block mt-0.5">{effectiveLeavesTaken} d</span>
              <span className="text-[9px] text-slate-400 block">{leaveTakenCount} full + {halfDayCount * 0.5} half</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Paid Leaves</span>
              <span className="text-lg font-bold text-emerald-400 block mt-0.5">{allowedPaidLeaves} d</span>
              <span className="text-[9px] text-emerald-300/80 block">No cut applied</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Unpaid Leaves</span>
              <span className={`text-lg font-bold block mt-0.5 ${unpaidLeaves > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {unpaidLeaves} d
              </span>
              <span className="text-[9px] text-slate-400 block">{unpaidLeaves > 0 ? 'Exceeds limit' : 'Within limit'}</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Salary Cut / Day</span>
              <span className="text-lg font-bold text-slate-200 block mt-0.5">₹{leaveCutRate.toLocaleString('en-IN')}</span>
              <span className="text-[9px] text-slate-400 block">{perLeaveCut > 0 ? 'Fixed rate' : 'Salary / 30'}</span>
            </div>

            <div className="bg-gradient-to-tr from-emerald-950 to-teal-900 rounded-2xl p-3 border border-emerald-500/40">
              <span className="text-[10px] uppercase font-extrabold text-emerald-300 block">Net Estimated Salary</span>
              <span className="text-xl font-black text-white block mt-0.5">₹{netEstimatedSalary.toLocaleString('en-IN')}</span>
              {totalSalaryCut > 0 && (
                <span className="text-[10px] text-rose-300 font-bold block">-₹{totalSalaryCut.toLocaleString('en-IN')} cut</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Header & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <p className="text-xs text-slate-500">
                Click any day to mark 🟢 Working, 🟠 Half Day, 🟡 {orgLeaveLabel}, or 🔴 Leave Taken
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMonthChange(new Date())}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-2 my-4 text-center">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-xs font-bold uppercase text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = recordsMap.get(dateStr);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentToday = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            let bgClass = 'bg-slate-50/60 border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-200';
            if (!isCurrentMonth) {
              bgClass = 'opacity-30 bg-slate-50/20 border-transparent';
            } else if (record?.status === 'working') {
              bgClass = 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60';
            } else if (record?.status === 'half_day') {
              bgClass = 'bg-orange-50/70 border-orange-200 hover:bg-orange-100/70';
            } else if (record?.status === 'leave_by_school' || record?.status === 'leave_by_office') {
              bgClass = 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60';
            } else if (record?.status === 'leave_taken') {
              bgClass = 'bg-rose-50/60 border-rose-200 hover:bg-rose-100/60';
            }

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`min-h-[70px] sm:min-h-[85px] p-2 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${bgClass} ${
                  isSelected ? 'ring-2 ring-indigo-500 shadow-md scale-[1.02]' : ''
                } ${isCurrentToday ? 'ring-1 ring-indigo-400' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                      isCurrentToday
                        ? 'bg-indigo-600 text-white'
                        : isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {getStatusBadge(record?.status)}
                </div>

                {record?.status && (
                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tight block truncate ${
                        record.status === 'working'
                          ? 'text-emerald-800 bg-emerald-100/80'
                          : record.status === 'half_day'
                          ? 'text-orange-800 bg-orange-100/80'
                          : record.status === 'leave_taken'
                          ? 'text-rose-800 bg-rose-100/80'
                          : 'text-amber-800 bg-amber-100/80'
                      }`}
                    >
                      {record.status === 'working'
                        ? 'Working'
                        : record.status === 'half_day'
                        ? 'Half Day (0.5)'
                        : record.status === 'leave_taken'
                        ? 'Leave Taken'
                        : type === 'school'
                        ? 'School Leave'
                        : 'Office Leave'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="font-medium">Working (🟢)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="font-medium">Half Day (🟠 - 0.5 Day)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="font-medium">{orgLeaveLabel} (🟡)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="font-medium">Leave Taken By You (🔴)</span>
          </div>
        </div>
      </div>

      {/* Date Status Selection Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 space-y-4">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400">Mark Attendance For</span>
              <h3 className="text-lg font-extrabold text-slate-800">
                {format(selectedDate, 'EEEE, d MMMM yyyy')}
              </h3>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSetStatus('working')}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🟢</span>
                  <span>Working</span>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-200/50 px-2 py-0.5 rounded-full font-semibold">
                  Select
                </span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSetStatus('half_day')}
                className="w-full py-3 px-4 rounded-2xl bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-800 font-bold text-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🟠</span>
                  <div className="text-left">
                    <span className="block font-bold">Half Day</span>
                    <span className="block text-[10px] text-orange-600 font-normal">0.5 Working + 0.5 Leave</span>
                  </div>
                </div>
                <span className="text-xs text-orange-600 bg-orange-200/50 px-2 py-0.5 rounded-full font-semibold">
                  Select
                </span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSetStatus(orgLeaveStatusKey)}
                className="w-full py-3 px-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🟡</span>
                  <span>{orgLeaveLabel}</span>
                </div>
                <span className="text-xs text-amber-600 bg-amber-200/50 px-2 py-0.5 rounded-full font-semibold">
                  Select
                </span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSetStatus('leave_taken')}
                className="w-full py-3 px-4 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-sm flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🔴</span>
                  <span>Leave Taken by You</span>
                </div>
                <span className="text-xs text-rose-600 bg-rose-200/50 px-2 py-0.5 rounded-full font-semibold">
                  Select
                </span>
              </button>

              {recordsMap.get(format(selectedDate, 'yyyy-MM-dd'))?.status && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSetStatus('clear')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-all mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Clear / Remove Status for this Day</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                Note / Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Exam duty, Doctor visit, Sick leave"
                value={selectedNote}
                onChange={e => setSelectedNote(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
