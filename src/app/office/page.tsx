'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { OfficeItem, OfficeDailyStatus } from '@/types';
import { AttendanceCalendar, AttendanceRecord } from '@/components/AttendanceCalendar';
import { MonthlySalaryCard } from '@/components/MonthlySalaryCard';
import { format } from 'date-fns';
import {
  Building2,
  Calendar,
  AlertTriangle,
  Loader2,
  MapPin,
  Edit2,
  Check,
} from 'lucide-react';

export default function OfficePage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState<OfficeItem | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [statuses, setStatuses] = useState<OfficeDailyStatus[]>([]);
  const [salaryRefreshKey, setSalaryRefreshKey] = useState(0);

  // Admin Office editing modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [paidLeavesDays, setPaidLeavesDays] = useState('0');
  const [perLeaveCut, setPerLeaveCut] = useState('');
  const [notes, setNotes] = useState('');
  const [savingOffice, setSavingOffice] = useState(false);

  // Route protection
  const isDevangi = role === 'devangi';

  // 1. Fetch Office Details
  const fetchOffice = useCallback(async () => {
    try {
      const res = await fetch('/api/office');
      if (res.ok) {
        const data = await res.json();
        setOffice(data.office);
        setCompanyName(data.office?.company_name || '');
        setLocation(data.office?.location || '');
        setMonthlySalary(data.office?.monthly_salary ? String(data.office.monthly_salary) : '');
        setPaidLeavesDays(data.office?.paid_leaves_days !== undefined ? String(data.office.paid_leaves_days) : '0');
        setPerLeaveCut(data.office?.per_leave_cut !== undefined && data.office?.per_leave_cut !== null ? String(data.office.per_leave_cut) : '');
        setNotes(data.office?.notes || '');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 2. Fetch Office Attendance Records
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const monthStr = format(currentMonth, 'yyyy-MM');
      const res = await fetch(`/api/office/status?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.statuses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    if (!isDevangi) {
      fetchOffice();
      fetchAttendance();
    }
  }, [fetchOffice, fetchAttendance, isDevangi]);

  if (isDevangi) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500">
          The Office attendance module is exclusively for Shrikesh and Admin.
        </p>
      </div>
    );
  }

  // Handle Save Status
  const handleSaveStatus = async (date: string, status: string, note?: string) => {
    try {
      const res = await fetch('/api/office/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_date: date,
          status,
          note,
        }),
      });

      if (res.ok) {
        toast(status === 'clear' ? `Office status removed: ${date}` : `Office status saved: ${date}`, 'success');
        fetchAttendance();
        setSalaryRefreshKey(k => k + 1);
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save office status', 'error');
      }
    } catch {
      toast('Failed to save office status', 'error');
    }
  };

  // Handle Admin update office details
  const handleUpdateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOffice(true);
    try {
      const res = await fetch('/api/office', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          location,
          monthly_salary: Number(monthlySalary || 0),
          paid_leaves_days: Number(paidLeavesDays || 0),
          per_leave_cut: Number(perLeaveCut || 0),
          notes,
        }),
      });

      if (res.ok) {
        toast('Office info updated', 'success');
        setShowEditModal(false);
        fetchOffice();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to update', 'error');
      }
    } catch {
      toast('Failed to update', 'error');
    } finally {
      setSavingOffice(false);
    }
  };

  const calendarRecords: AttendanceRecord[] = statuses.map(s => ({
    date: s.status_date,
    status: s.status,
    note: s.note,
  }));

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-100">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Office Attendance</h1>
            <p className="text-xs text-slate-500">
              Shrikesh's daily status tracking (🟢 Working, 🟡 Office Leave, 🔴 Leave Taken, 🟠 Half Day)
            </p>
          </div>
        </div>

        {/* Info banner confirming no separate office kharcha */}
        <div className="bg-sky-50 border border-sky-200 px-3.5 py-2 rounded-2xl text-xs text-sky-800 font-medium">
          💡 For expenses, please use the main <strong>Daily Kharcha</strong> section.
        </div>
      </div>

      {/* Office Company Header Card */}
      {office && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Workplace
              </span>
              {(role === 'admin' || role === 'shrikesh') && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-sky-600 hover:text-sky-800 p-1 rounded-lg hover:bg-sky-50 transition-colors"
                  title="Edit Workplace & Salary Policy"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-800">{office.company_name}</h2>
            {office.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{office.location}</span>
              </p>
            )}
          </div>

          {/* Salary & Leave Policy Pill */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Monthly Base Salary</span>
              <span className="text-sm font-extrabold text-sky-700 block">
                ₹{Number(office.monthly_salary || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paid Leaves</span>
              <span className="text-sm font-extrabold text-slate-700 block">
                {Number(office.paid_leaves_days || 0)} d / mo
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Per Leave Cut</span>
              <span className="text-sm font-extrabold text-rose-600 block">
                ₹{Number(office.per_leave_cut || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 sm:text-right">
            <span>Primary Employee: </span>
            <span className="font-bold text-slate-700">Shrikesh</span>
          </div>
        </div>
      )}

      {/* Monthly Received Salary & Carry-Over Balance */}
      <MonthlySalaryCard
        key={`office-salary-${salaryRefreshKey}`}
        type="office"
        currentMonth={currentMonth}
        onSalaryChanged={() => {
          fetchAttendance();
          setSalaryRefreshKey(k => k + 1);
        }}
        userRole={role}
      />

      {/* Interactive Attendance Calendar Component */}
      <AttendanceCalendar
        type="office"
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        records={calendarRecords}
        onSaveStatus={handleSaveStatus}
        monthlySalary={Number(office?.monthly_salary || 0)}
        paidLeavesDays={Number(office?.paid_leaves_days || 0)}
        perLeaveCut={Number(office?.per_leave_cut || 0)}
      />

      {/* Admin Edit Office Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div>
              <span className="text-xs uppercase font-bold text-sky-600">Admin Control</span>
              <h3 className="text-lg font-bold text-slate-800">Edit Workplace & Policy</h3>
              <p className="text-xs text-slate-400">Configure salary, paid leaves, and per-leave cut for Shrikesh.</p>
            </div>

            <form onSubmit={handleUpdateOffice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Company / Office Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Location / Office Branch
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Monthly Base Salary (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 50000"
                    value={monthlySalary}
                    onChange={e => setMonthlySalary(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Paid Leaves / Mo (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 1.5 or 2"
                    value={paidLeavesDays}
                    onChange={e => setPaidLeavesDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Per Leave Salary Cut (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 1000 (0 for standard Salary / 30)"
                  value={perLeaveCut}
                  onChange={e => setPerLeaveCut(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave 0 or empty for automatic daily deduction (Salary ÷ 30).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOffice}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingOffice && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
