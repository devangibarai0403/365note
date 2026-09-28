'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ClassItem, ClassRecord } from '@/types';
import { calculateDurationHours } from '@/lib/time-utils';
import {
  GraduationCap,
  Plus,
  Clock,
  Calendar,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

export default function ClassesPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [summary, setSummary] = useState({ totalRecords: 0, totalHours: 0, totalEarnings: 0 });

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterClass, setFilterClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Daily Class Entry Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [fromTime, setFromTime] = useState('05:00 PM');
  const [toTime, setToTime] = useState('07:00 PM');
  const [hours, setHours] = useState(2);
  const [totalAmount, setTotalAmount] = useState(1000);
  const [entryNotes, setEntryNotes] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Admin Class Management Modal / State
  const [showAdminClassModal, setShowAdminClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classNameInput, setClassNameInput] = useState('');
  const [classRateInput, setClassRateInput] = useState('');
  const [classDescInput, setClassDescInput] = useState('');
  const [savingClass, setSavingClass] = useState(false);

  // Protect route
  const isShrikesh = role === 'shrikesh';

  // 1. Fetch Classes List
  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClassesList(data.classes || []);
        if (data.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(data.classes[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedClassId]);

  // 2. Fetch Class Records with filters
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/class-records?month=${selectedMonth}`;
      if (filterClass) url += `&class_name=${encodeURIComponent(filterClass)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || { totalRecords: 0, totalHours: 0, totalEarnings: 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, filterClass]);

  useEffect(() => {
    if (!isShrikesh) {
      fetchClasses();
      fetchRecords();
    }
  }, [fetchClasses, fetchRecords, isShrikesh]);

  // Recalculate hours and total amount dynamically
  useEffect(() => {
    if (selectedClassId && classesList.length > 0) {
      const cls = classesList.find(c => c.id === selectedClassId);
      const rate = cls ? Number(cls.hourly_rate) : 500;
      const h = calculateDurationHours(fromTime, toTime);
      setHours(h);
      setTotalAmount(Math.round(h * rate * 100) / 100);
    }
  }, [fromTime, toTime, selectedClassId, classesList]);

  // Check if unauthorized
  if (isShrikesh) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500">
          The Classes section is reserved for Devangi and Admin.
        </p>
      </div>
    );
  }

  // Handle Daily Class Entry
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      toast('Please select a class', 'error');
      return;
    }

    setSubmittingEntry(true);
    try {
      const cls = classesList.find(c => c.id === selectedClassId);
      const res = await fetch('/api/class-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          class_name: cls?.name,
          record_date: entryDate,
          from_time: fromTime,
          to_time: toTime,
          hours,
          notes: entryNotes,
        }),
      });

      if (res.ok) {
        toast(`Class saved: ${hours} hrs • ₹${totalAmount}`, 'success');
        setEntryNotes('');
        fetchRecords();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save class record', 'error');
      }
    } catch {
      toast('Failed to save class record', 'error');
    } finally {
      setSubmittingEntry(false);
    }
  };

  // Handle Class Delete
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class record?')) return;
    try {
      const res = await fetch(`/api/class-records?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Record deleted', 'info');
        fetchRecords();
      }
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  // Handle Admin Class Creation or Edit
  const handleSaveClassDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput || !classRateInput) {
      toast('Class name and rate are required', 'error');
      return;
    }

    setSavingClass(true);
    try {
      const url = '/api/classes';
      const method = editingClass ? 'PUT' : 'POST';
      const body: any = {
        name: classNameInput,
        hourly_rate: Number(classRateInput),
        description: classDescInput,
      };
      if (editingClass) body.id = editingClass.id;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast(
          editingClass
            ? `Class "${classNameInput}" updated (new rate: ₹${classRateInput}/hr)`
            : `Class "${classNameInput}" created at ₹${classRateInput}/hr`,
          'success'
        );
        setShowAdminClassModal(false);
        setEditingClass(null);
        setClassNameInput('');
        setClassRateInput('');
        setClassDescInput('');
        fetchClasses();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save class definition', 'error');
      }
    } catch {
      toast('Failed to save class', 'error');
    } finally {
      setSavingClass(false);
    }
  };

  // Today's stats calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.record_date === todayStr);
  const todayHours = todayRecords.reduce((acc, r) => acc + Number(r.hours || 0), 0);
  const todayEarnings = todayRecords.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);

  // Month selector options
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  // Filtered records by search query
  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.class_name.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q)) ||
      r.record_date.includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Classes Management</h1>
            <p className="text-xs text-slate-500">
              Daily entries, hour calculation, frozen hourly rates & historical records
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {role === 'admin' && (
            <>
              <button
                onClick={() => {
                  setEditingClass(null);
                  setClassNameInput('');
                  setClassRateInput('500');
                  setClassDescInput('');
                  setShowAdminClassModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Define New Class</span>
              </button>

              <Link
                href="/excel-import"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Upload Excel</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards: Today & Month */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Today's Classes</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{todayRecords.length}</h3>
          <span className="text-[10px] text-slate-400">Sessions today</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Today's Hours</span>
          <h3 className="text-2xl font-black text-indigo-600 mt-1">
            {Math.round(todayHours * 100) / 100} hrs
          </h3>
          <span className="text-[10px] text-slate-400">Hours taught</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Today's Earnings</span>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">
            ₹{Math.round(todayEarnings).toLocaleString('en-IN')}
          </h3>
          <span className="text-[10px] text-emerald-600/80">Earned today</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Monthly Classes</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{summary.totalRecords}</h3>
          <span className="text-[10px] text-slate-400">{selectedMonth}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Monthly Hours</span>
          <h3 className="text-2xl font-black text-violet-600 mt-1">{summary.totalHours} hrs</h3>
          <span className="text-[10px] text-slate-400">Total duration</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase">Monthly Earnings</span>
          <h3 className="text-2xl font-black text-indigo-700 mt-1">
            ₹{Math.round(summary.totalEarnings).toLocaleString('en-IN')}
          </h3>
          <span className="text-[10px] text-indigo-600/80">Total income</span>
        </div>
      </div>

      {/* Main Form & Classes Manager Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Daily Class Entry (Fast, Simple, 10-Second Flow) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-base text-slate-800">Record a Class</h2>
              <p className="text-xs text-slate-400">Add any number of classes per day</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Quick Entry
            </span>
          </div>

          <form onSubmit={handleSaveRecord} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Select Class *
              </label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classesList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — ₹{c.hourly_rate}/hr
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Class Date *
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  From Time *
                </label>
                <input
                  type="text"
                  placeholder="05:00 PM"
                  value={fromTime}
                  onChange={e => setFromTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  To Time *
                </label>
                <input
                  type="text"
                  placeholder="07:00 PM"
                  value={toTime}
                  onChange={e => setToTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Live Auto-Calculation Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-indigo-600" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Duration
                  </span>
                  <span className="text-sm font-black text-slate-800">{hours} Hours</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Total Amount
                </span>
                <span className="text-lg font-black text-indigo-700">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Notes / Topics Covered (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Chapter 4 Integration, Mock Test"
                value={entryNotes}
                onChange={e => setEntryNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingEntry}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submittingEntry ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Save Class Record</span>
            </button>
          </form>

          {/* Admin Defined Rates List */}
          {role === 'admin' && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-400 block">
                Active Classes & Hourly Rates
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {classesList.map(c => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <span className="text-indigo-600 font-extrabold ml-2">
                        ₹{c.hourly_rate}/hr
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingClass(c);
                        setClassNameInput(c.name);
                        setClassRateInput(String(c.hourly_rate));
                        setClassDescInput(c.description || '');
                        setShowAdminClassModal(true);
                      }}
                      className="text-slate-400 hover:text-indigo-600 p-1"
                      title="Edit Rate"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Class Records Table & Filter */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bold text-base text-slate-800">Class Records History</h2>
              <p className="text-xs text-slate-400">
                Detailed date-wise sessions with frozen historical hourly rates
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                {monthOptions.map(m => (
                  <option key={m.val} value={m.val}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="">All Classes</option>
                {classesList.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by class name, date, or topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Records Table */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs text-slate-400">Loading class entries...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">No class records found</p>
              <p className="text-xs text-slate-400">
                Use the form on the left to enter today's class, or upload an Excel file.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Timing</th>
                    <th className="py-2.5 px-3">Hours</th>
                    <th className="py-2.5 px-3">Hourly Rate</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {r.record_date}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {r.class_name}
                        {r.imported_from_excel && (
                          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Excel
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {r.from_time} – {r.to_time}
                      </td>
                      <td className="py-3 px-3 font-bold text-indigo-600">
                        {r.hours} hrs
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        ₹{Number(r.hourly_rate)}/hr
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-700">
                        ₹{Number(r.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteRecord(r.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Admin Define / Edit Class Modal */}
      {showAdminClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div>
              <span className="text-xs uppercase font-bold text-amber-600">Admin Control</span>
              <h3 className="text-lg font-bold text-slate-800">
                {editingClass ? 'Edit Class & Rate' : 'Define New Class'}
              </h3>
              <p className="text-xs text-slate-400">
                Hourly rate changes will apply to future entries without affecting historical records.
              </p>
            </div>

            <form onSubmit={handleSaveClassDefinition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maths, Physics, Chemistry"
                  value={classNameInput}
                  onChange={e => setClassNameInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Hourly Rate (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 500"
                    value={classRateInput}
                    onChange={e => setClassRateInput(e.target.value)}
                    required
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Higher Secondary coaching"
                  value={classDescInput}
                  onChange={e => setClassDescInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminClassModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingClass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingClass ? 'Update Class' : 'Create Class'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
