'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ClassItem, ClassRecord, ClassSubject } from '@/types';
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
  BookOpen,
  Layers,
  X,
  Download,
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
  const [filterSubject, setFilterSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Export states
  const [exportingMonth, setExportingMonth] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  // Daily Class Entry Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
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
  const [classDescInput, setClassDescInput] = useState('');
  const [initialSubjectName, setInitialSubjectName] = useState('');
  const [initialSubjectRate, setInitialSubjectRate] = useState('500');
  const [savingClass, setSavingClass] = useState(false);

  // Admin Subject Management Modal / State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectModalClass, setSubjectModalClass] = useState<ClassItem | null>(null);
  const [editingSubject, setEditingSubject] = useState<ClassSubject | null>(null);
  const [subjectNameInput, setSubjectNameInput] = useState('');
  const [subjectRateInput, setSubjectRateInput] = useState('500');
  const [subjectDescInput, setSubjectDescInput] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  // Edit Class Record Modal / State
  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClassRecord | null>(null);
  const [editRecordRate, setEditRecordRate] = useState('500');
  const [editRecordHours, setEditRecordHours] = useState('1');
  const [editRecordFromTime, setEditRecordFromTime] = useState('');
  const [editRecordToTime, setEditRecordToTime] = useState('');
  const [editRecordNotes, setEditRecordNotes] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);

  // Protect route
  const isShrikesh = role === 'shrikesh';

  // 1. Fetch Classes List with their subjects
  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes');
      if (res.ok) {
        const data = await res.json();
        const loadedClasses: ClassItem[] = data.classes || [];
        setClassesList(loadedClasses);

        if (loadedClasses.length > 0) {
          setSelectedClassId(prevId => {
            const exists = loadedClasses.some(c => c.id === prevId);
            const activeId = exists ? prevId : loadedClasses[0].id;
            const targetClass = loadedClasses.find(c => c.id === activeId);

            // Sync subject
            if (targetClass?.subjects && targetClass.subjects.length > 0) {
              setSelectedSubjectId(prevSubId => {
                const subExists = targetClass.subjects?.some(s => s.id === prevSubId);
                return subExists ? prevSubId : targetClass.subjects![0].id;
              });
            } else {
              setSelectedSubjectId('');
            }

            return activeId;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 2. Fetch Class Records with filters
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/class-records?month=${selectedMonth}`;
      if (filterClass) url += `&class_name=${encodeURIComponent(filterClass)}`;
      if (filterSubject) url += `&subject_name=${encodeURIComponent(filterSubject)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setSummary(data.summary || { totalRecords: 0, totalHours: 0, totalEarnings: 0 });
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Fetch records failed:', err);
        setRecords([]);
        setSummary({ totalRecords: 0, totalHours: 0, totalEarnings: 0 });
      }
    } catch (e) {
      console.error(e);
      setRecords([]);
      setSummary({ totalRecords: 0, totalHours: 0, totalEarnings: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, filterClass, filterSubject]);

  useEffect(() => {
    if (!isShrikesh) {
      fetchClasses();
      fetchRecords();
    }
  }, [fetchClasses, fetchRecords, isShrikesh]);

  // When selected class changes in entry form, sync subject dropdown
  const handleClassSelectionChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const targetClass = classesList.find(c => c.id === newClassId);
    if (targetClass?.subjects && targetClass.subjects.length > 0) {
      setSelectedSubjectId(targetClass.subjects[0].id);
    } else {
      setSelectedSubjectId('');
    }
  };

  // Recalculate hours and total amount dynamically based on selected subject rate
  useEffect(() => {
    if (selectedClassId && classesList.length > 0) {
      const cls = classesList.find(c => c.id === selectedClassId);
      const subjs = cls?.subjects || [];
      const matchedSubj = subjs.find(s => s.id === selectedSubjectId) || subjs[0];
      const rate = matchedSubj ? Number(matchedSubj.hourly_rate) : 0;

      const h = calculateDurationHours(fromTime, toTime);
      setHours(h);
      setTotalAmount(Math.round(h * rate * 100) / 100);
    }
  }, [fromTime, toTime, selectedClassId, selectedSubjectId, classesList]);

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
      const subjs = cls?.subjects || [];
      const matchedSubj = subjs.find(s => s.id === selectedSubjectId) || subjs[0];

      const res = await fetch('/api/class-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          class_name: cls?.name,
          subject_id: matchedSubj?.id,
          subject_name: matchedSubj?.subject_name,
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

  // Handle Class Record Delete
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

  // Handle Excel Export (selected month or all months)
  const handleExportExcel = async (targetMonth: string) => {
    const isAll = targetMonth === 'all';
    if (isAll) setExportingAll(true);
    else setExportingMonth(true);

    try {
      let url = `/api/class-records/export?month=${encodeURIComponent(targetMonth)}`;
      if (filterClass) url += `&class_name=${encodeURIComponent(filterClass)}`;
      if (filterSubject) url += `&subject_name=${encodeURIComponent(filterSubject)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export records');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      const contentDisposition = res.headers.get('content-disposition');
      let filename = isAll ? 'all_class_records.xlsx' : `class_records_${targetMonth.replace('-', '_')}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast(`Excel downloaded: ${filename}`, 'success');
    } catch (err: any) {
      toast(err.message || 'Export failed', 'error');
    } finally {
      if (isAll) setExportingAll(false);
      else setExportingMonth(false);
    }
  };

  // Open Modal for New Class
  const handleOpenNewClassModal = () => {
    setEditingClass(null);
    setClassNameInput('');
    setClassDescInput('');
    setInitialSubjectName('');
    setInitialSubjectRate('500');
    setShowAdminClassModal(true);
  };

  // Open Modal for Editing Class
  const handleOpenEditClassModal = (c: ClassItem) => {
    setEditingClass(c);
    setClassNameInput(c.name);
    setClassDescInput(c.description || '');
    setShowAdminClassModal(true);
  };

  // Handle Admin Class Creation or Edit
  const handleSaveClassDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      toast('Class name is required', 'error');
      return;
    }

    setSavingClass(true);
    try {
      const url = '/api/classes';
      const method = editingClass ? 'PUT' : 'POST';
      const body: any = {
        name: classNameInput.trim(),
        description: classDescInput.trim() || undefined,
      };

      if (editingClass) {
        body.id = editingClass.id;
      } else {
        // If creating new class, include initial subject if provided
        if (initialSubjectName.trim()) {
          const sRate = Number(initialSubjectRate);
          if (isNaN(sRate) || sRate <= 0) {
            toast('Valid subject hourly rate is required', 'error');
            setSavingClass(false);
            return;
          }
          body.subjects = [
            {
              subject_name: initialSubjectName.trim(),
              hourly_rate: sRate,
            }
          ];
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast(
          editingClass
            ? `Class "${classNameInput}" updated`
            : `Class "${classNameInput}" created successfully`,
          'success'
        );
        setShowAdminClassModal(false);
        setEditingClass(null);
        setClassNameInput('');
        setClassDescInput('');
        setInitialSubjectName('');
        setInitialSubjectRate('500');
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

  // Open Modal to Edit an Existing Class Record
  const handleOpenEditRecordModal = (record: ClassRecord) => {
    setEditingRecord(record);
    setEditRecordRate(String(record.hourly_rate));
    setEditRecordHours(String(record.hours));
    setEditRecordFromTime(record.from_time);
    setEditRecordToTime(record.to_time);
    setEditRecordNotes(record.notes || '');
    setShowEditRecordModal(true);
  };

  // Handle Save Edited Record
  const handleSaveEditedRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const rateNum = Number(editRecordRate);
    const hoursNum = Number(editRecordHours);

    if (isNaN(rateNum) || rateNum <= 0) {
      toast('Valid hourly rate is required', 'error');
      return;
    }
    if (isNaN(hoursNum) || hoursNum <= 0) {
      toast('Valid hours duration is required', 'error');
      return;
    }

    setSavingRecord(true);
    try {
      const res = await fetch('/api/class-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecord.id,
          hourly_rate: rateNum,
          hours: hoursNum,
          from_time: editRecordFromTime,
          to_time: editRecordToTime,
          notes: editRecordNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast('Class record updated with new hourly rate', 'success');
        setShowEditRecordModal(false);
        setEditingRecord(null);
        fetchRecords();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to update record', 'error');
      }
    } catch {
      toast('Failed to update record', 'error');
    } finally {
      setSavingRecord(false);
    }
  };

  // Handle Class Delete
  const handleDeleteClass = async (classItem: ClassItem) => {
    if (!confirm(`Are you sure you want to delete class "${classItem.name}" and all its subjects?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/classes?id=${classItem.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast(`Class "${classItem.name}" deleted`, 'info');
        fetchClasses();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to delete class', 'error');
      }
    } catch {
      toast('Failed to delete class', 'error');
    }
  };

  // Open Subject Modal to Add new subject to a specific class
  const handleOpenAddSubjectModal = (targetClass: ClassItem) => {
    setSubjectModalClass(targetClass);
    setEditingSubject(null);
    setSubjectNameInput('');
    setSubjectRateInput('500');
    setSubjectDescInput('');
    setShowSubjectModal(true);
  };

  // Open Subject Modal to Edit an existing subject
  const handleOpenEditSubjectModal = (targetClass: ClassItem, subject: ClassSubject) => {
    setSubjectModalClass(targetClass);
    setEditingSubject(subject);
    setSubjectNameInput(subject.subject_name);
    setSubjectRateInput(String(subject.hourly_rate));
    setSubjectDescInput(subject.description || '');
    setShowSubjectModal(true);
  };

  // Handle Save Subject (Create or Edit)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectModalClass) return;

    if (!subjectNameInput.trim()) {
      toast('Subject name is required', 'error');
      return;
    }

    const rateNum = Number(subjectRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      toast('Valid hourly price is required', 'error');
      return;
    }

    setSavingSubject(true);
    try {
      const url = '/api/classes/subjects';
      const method = editingSubject ? 'PUT' : 'POST';
      const body: any = {
        subject_name: subjectNameInput.trim(),
        hourly_rate: rateNum,
        description: subjectDescInput.trim() || undefined,
      };

      if (editingSubject) {
        body.id = editingSubject.id;
      } else {
        body.class_id = subjectModalClass.id;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast(
          editingSubject
            ? `Subject "${subjectNameInput}" updated (₹${rateNum}/hr)`
            : `Subject "${subjectNameInput}" added to ${subjectModalClass.name} (₹${rateNum}/hr)`,
          'success'
        );
        setShowSubjectModal(false);
        setSubjectModalClass(null);
        setEditingSubject(null);
        fetchClasses();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save subject', 'error');
      }
    } catch {
      toast('Failed to save subject', 'error');
    } finally {
      setSavingSubject(false);
    }
  };

  // Handle Subject Delete
  const handleDeleteSubject = async (subject: ClassSubject, classItem: ClassItem) => {
    if (!confirm(`Are you sure you want to delete subject "${subject.subject_name}" from ${classItem.name}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/classes/subjects?id=${subject.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast(`Subject "${subject.subject_name}" deleted`, 'info');
        fetchClasses();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to delete subject', 'error');
      }
    } catch {
      toast('Failed to delete subject', 'error');
    }
  };

  // Selected Class details for entry form
  const selectedClass = classesList.find(c => c.id === selectedClassId);
  const availableSubjects = selectedClass?.subjects || [];
  const selectedSubject = availableSubjects.find(s => s.id === selectedSubjectId) || availableSubjects[0];

  // Today's stats calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.record_date === todayStr);
  const todayHours = todayRecords.reduce((acc, r) => acc + Number(r.hours || 0), 0);
  const todayEarnings = todayRecords.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);

  // Month selector options (includes All Months + past 12 months)
  const monthOptions: { val: string; label: string }[] = [
    { val: 'all', label: 'All Months (Lifetime)' },
  ];
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
      (r.subject_name && r.subject_name.toLowerCase().includes(q)) ||
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
              Manage classes, multi-subject hourly rates, daily class sessions & earnings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExportExcel('all')}
            disabled={exportingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            title="Download full Excel report containing all months and monthly summary"
          >
            {exportingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>Export All Records</span>
          </button>

          {role === 'admin' && (
            <>
              <button
                onClick={() => {
                  setEditingClass(null);
                  setClassNameInput('');
                  setClassDescInput('');
                  setInitialSubjectName('');
                  setInitialSubjectRate('500');
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
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {selectedMonth === 'all' ? 'All Classes' : 'Monthly Classes'}
          </span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{summary.totalRecords}</h3>
          <span className="text-[10px] text-slate-400">
            {selectedMonth === 'all' ? 'Lifetime Total' : selectedMonth}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">
            {selectedMonth === 'all' ? 'Total Hours' : 'Monthly Hours'}
          </span>
          <h3 className="text-2xl font-black text-violet-600 mt-1">{summary.totalHours} hrs</h3>
          <span className="text-[10px] text-slate-400">
            {selectedMonth === 'all' ? 'Lifetime Duration' : 'Total duration'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase">
            {selectedMonth === 'all' ? 'Total Earnings' : 'Monthly Earnings'}
          </span>
          <h3 className="text-2xl font-black text-indigo-700 mt-1">
            ₹{Math.round(summary.totalEarnings).toLocaleString('en-IN')}
          </h3>
          <span className="text-[10px] text-indigo-600/80">
            {selectedMonth === 'all' ? 'Lifetime Income' : 'Total income'}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Column (Entry + Admin Management) & Right Column (Records Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Daily Class Entry Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-base text-slate-800">Record a Class</h2>
                <p className="text-xs text-slate-400">Select class & subject for auto hourly price</p>
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
                  onChange={e => handleClassSelectionChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.subjects && c.subjects.length > 0 ? `(${c.subjects.length} subjects)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Select Subject *
                  </label>
                  {selectedSubject && (
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      ₹{selectedSubject.hourly_rate}/hr
                    </span>
                  )}
                </div>

                {availableSubjects.length > 0 ? (
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {availableSubjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name} — ₹{s.hourly_rate}/hr
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                    <span>No subjects configured for this class.</span>
                    {role === 'admin' && selectedClass && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddSubjectModal(selectedClass)}
                        className="font-bold underline text-amber-900 ml-2"
                      >
                        + Add Subject
                      </button>
                    )}
                  </div>
                )}
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
          </div>

          {/* Admin Classes & Multi-Subject Rate Configurations */}
          {role === 'admin' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-800">Class & Subject Rates</h3>
                </div>
                <button
                  onClick={handleOpenNewClassModal}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Class</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {classesList.map(c => {
                  const subjs = c.subjects || [];
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                    >
                      {/* Class Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-black text-sm text-slate-900 block">{c.name}</span>
                          {c.description && (
                            <span className="text-[11px] text-slate-400 block">{c.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditClassModal(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Class"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subjects List for this Class */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                          <span>Subjects & Hourly Rates:</span>
                          <button
                            onClick={() => handleOpenAddSubjectModal(c)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Subject</span>
                          </button>
                        </div>

                        {subjs.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic py-1">
                            No subjects yet. Click "+ Add Subject" to set hourly rates.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {subjs.map(s => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/70 text-xs shadow-2xs"
                              >
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="font-bold text-slate-800">{s.subject_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                                    ₹{s.hourly_rate}/hr
                                  </span>
                                  <button
                                    onClick={() => handleOpenEditSubjectModal(c, s)}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                    title="Edit Subject & Rate"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubject(s, c)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete Subject"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                Detailed date-wise sessions with subject and frozen hourly rates
              </p>
            </div>

            {/* Filters & Export */}
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

              {/* Export Month Button */}
              <button
                type="button"
                onClick={() => handleExportExcel(selectedMonth)}
                disabled={exportingMonth}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                title={`Export ${selectedMonth === 'all' ? 'All Months' : selectedMonth} records to Excel`}
              >
                {exportingMonth ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{selectedMonth === 'all' ? 'Export Excel' : 'Export Month (.xlsx)'}</span>
              </button>

              {/* Export All Months Button */}
              {selectedMonth !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleExportExcel('all')}
                  disabled={exportingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  title="Export all months class records (lifetime) to Excel"
                >
                  {exportingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Export All (.xlsx)</span>
                </button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by class, subject, date, or topic..."
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
                    <th className="py-2.5 px-3">Class & Subject</th>
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
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{r.class_name}</span>
                          {r.subject_name && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {r.subject_name}
                            </span>
                          )}
                          {r.imported_from_excel && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Excel
                            </span>
                          )}
                        </div>
                        {r.notes && (
                          <span className="text-[11px] text-slate-400 block mt-0.5 truncate max-w-xs">
                            {r.notes}
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditRecordModal(r)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Class Record & Rate"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-amber-600">Admin Control</span>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingClass ? 'Edit Class' : 'Define New Class'}
                </h3>
              </div>
              <button
                onClick={() => setShowAdminClassModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Classes group related subjects (e.g. Aero, Shiksha Niketan, Class 10). Hourly prices are configured per subject inside the class.
            </p>

            <form onSubmit={handleSaveClassDefinition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aero Academy, Class 10, Class 12"
                  value={classNameInput}
                  onChange={e => setClassNameInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Higher Secondary Coaching"
                  value={classDescInput}
                  onChange={e => setClassDescInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!editingClass && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-indigo-900 block">
                    Initial Subject & Hourly Rate (Optional)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-700 mb-0.5">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. English, Maths"
                        value={initialSubjectName}
                        onChange={e => setInitialSubjectName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-700 mb-0.5">
                        Hourly Price (₹)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="500"
                        value={initialSubjectRate}
                        onChange={e => setInitialSubjectRate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-indigo-600 block">
                    You can add more subjects and different hourly prices at any time!
                  </span>
                </div>
              )}

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

      {/* Admin Subject Modal (Add or Edit Subject for a Class) */}
      {showSubjectModal && subjectModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-600">
                  {subjectModalClass.name}
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingSubject ? 'Edit Subject & Hourly Price' : 'Add Subject to Class'}
                </h3>
              </div>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Each subject can have a distinct hourly rate. Future class entries will use this rate.
            </p>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maths, Physics, Chemistry, English"
                  value={subjectNameInput}
                  onChange={e => setSubjectNameInput(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Hourly Price (₹) *
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
                    value={subjectRateInput}
                    onChange={e => setSubjectRateInput(e.target.value)}
                    required
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Description / Syllabus (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Theory & Practicals"
                  value={subjectDescInput}
                  onChange={e => setSubjectDescInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingSubject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSubject ? 'Update Subject' : 'Save Subject'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin / Devangi Edit Existing Class Record Modal */}
      {showEditRecordModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-600">
                  {editingRecord.class_name} {editingRecord.subject_name ? `• ${editingRecord.subject_name}` : ''}
                </span>
                <h3 className="text-lg font-bold text-slate-800">Edit Class Session & Rate</h3>
              </div>
              <button
                onClick={() => setShowEditRecordModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Adjust timing, duration hours, or per hour rate for this specific class session.
            </p>

            <form onSubmit={handleSaveEditedRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    From Time
                  </label>
                  <input
                    type="text"
                    value={editRecordFromTime}
                    onChange={e => setEditRecordFromTime(e.target.value)}
                    placeholder="05:00 PM"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    To Time
                  </label>
                  <input
                    type="text"
                    value={editRecordToTime}
                    onChange={e => setEditRecordToTime(e.target.value)}
                    placeholder="07:00 PM"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Hours *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.25"
                    value={editRecordHours}
                    onChange={e => setEditRecordHours(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Hourly Rate (₹/hr) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={editRecordRate}
                      onChange={e => setEditRecordRate(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-indigo-700 block">Total Earnings</span>
                  <span className="text-[10px] text-indigo-500">Hours × Hourly Rate</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-indigo-700">
                    ₹{(Math.round(Number(editRecordHours || 0) * Number(editRecordRate || 0) * 100) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 Integration"
                  value={editRecordNotes}
                  onChange={e => setEditRecordNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditRecordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingRecord && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
