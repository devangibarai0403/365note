'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ClassItem,
  ClassRecord,
  ClassSubject,
  MonthlyClassPaymentSummary,
  ClassPayment,
  PaymentMode,
  UserBalance,
} from '@/types';
import { calculateDurationHours } from '@/lib/time-utils';
import { format } from 'date-fns';
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
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Layers,
  X,
  Download,
  Power,
  Check,
  Wallet,
  Banknote,
  CreditCard,
  History,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
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

  // Monthly Class Payments & Balance state
  const [monthlyClassesSummary, setMonthlyClassesSummary] = useState<MonthlyClassPaymentSummary[]>([]);
  const [paymentsTotals, setPaymentsTotals] = useState({
    total_billed: 0,
    total_paid: 0,
    total_cash_paid: 0,
    total_online_paid: 0,
    total_balance_due: 0,
    full_paid_count: 0,
    pending_count: 0,
  });
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [devangiBalance, setDevangiBalance] = useState<UserBalance | null>(null);
  const [paymentForms, setPaymentForms] = useState<
    Record<string, { amount: string; mode: PaymentMode; date: string; notes: string; submitting?: boolean }>
  >({});
  const [expandedPaymentHistory, setExpandedPaymentHistory] = useState<Record<string, boolean>>({});
  const [showPaymentsSection, setShowPaymentsSection] = useState(true);

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

        const activeClasses = loadedClasses.filter(c => c.is_active !== false);
        if (activeClasses.length > 0) {
          setSelectedClassId(prevId => {
            const exists = activeClasses.some(c => c.id === prevId);
            const activeId = exists ? prevId : activeClasses[0].id;
            const targetClass = activeClasses.find(c => c.id === activeId);

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

  // 3. Fetch Monthly Class Payments and Balance Status
  const fetchPaymentsSummary = useCallback(async () => {
    try {
      setLoadingPayments(true);
      let url = `/api/class-payments?month=${selectedMonth}`;
      if (filterClass) url += `&class_name=${encodeURIComponent(filterClass)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMonthlyClassesSummary(data.classesSummary || []);
        setPaymentsTotals(
          data.totals || {
            total_billed: 0,
            total_paid: 0,
            total_cash_paid: 0,
            total_online_paid: 0,
            total_balance_due: 0,
            full_paid_count: 0,
            pending_count: 0,
          }
        );
      }
    } catch (e) {
      console.error('Fetch payments error:', e);
    } finally {
      setLoadingPayments(false);
    }
  }, [selectedMonth, filterClass]);

  // 4. Fetch Devangi's Live Balance
  const fetchDevangiBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/balance?user_id=devangi');
      if (res.ok) {
        const data = await res.json();
        setDevangiBalance(data.balance || null);
      }
    } catch (e) {
      console.error('Fetch devangi balance error:', e);
    }
  }, []);

  useEffect(() => {
    if (!isShrikesh) {
      fetchClasses();
      fetchRecords();
      fetchPaymentsSummary();
      fetchDevangiBalance();
    }
  }, [fetchClasses, fetchRecords, fetchPaymentsSummary, fetchDevangiBalance, isShrikesh]);

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
        fetchPaymentsSummary();
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
        fetchPaymentsSummary();
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
        fetchPaymentsSummary();
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

  // Toggle Class Active / Deactivated Status
  const handleToggleClassActive = async (classItem: ClassItem) => {
    const nextState = classItem.is_active === false ? true : false;
    const actionText = nextState ? 'reactivate' : 'deactivate';
    if (
      !confirm(
        `Are you sure you want to ${actionText} "${classItem.name}"? ${
          nextState
            ? 'It will now appear in your daily class recording dropdown.'
            : 'It will no longer appear in your daily class recording dropdown, but all past records, history, and earnings remain intact.'
        }`
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: classItem.id,
          is_active: nextState,
        }),
      });

      if (res.ok) {
        toast(
          `Class "${classItem.name}" ${nextState ? 'reactivated' : 'deactivated'} successfully!`,
          'success'
        );
        fetchClasses();
      } else {
        const err = await res.json();
        toast(err.error || `Failed to ${actionText} class`, 'error');
      }
    } catch {
      toast(`Failed to ${actionText} class`, 'error');
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

  // Helper to get or init payment form state for a class
  const getPaymentForm = (className: string, balanceDue: number) => {
    return (
      paymentForms[className] || {
        amount: balanceDue > 0 ? String(balanceDue) : '',
        mode: 'Online' as PaymentMode,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        submitting: false,
      }
    );
  };

  const updatePaymentFormField = (
    className: string,
    field: 'amount' | 'mode' | 'date' | 'notes',
    value: any,
    fallbackBalance: number = 0
  ) => {
    setPaymentForms(prev => {
      const current = prev[className] || {
        amount: fallbackBalance > 0 ? String(fallbackBalance) : '',
        mode: 'Online' as PaymentMode,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        submitting: false,
      };
      return {
        ...prev,
        [className]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Record payment for an individual class
  const handleRecordPayment = async (className: string, classId?: string, balanceDue: number = 0) => {
    const form = getPaymentForm(className, balanceDue);
    const amtNum = Number(form.amount);

    if (isNaN(amtNum) || amtNum <= 0) {
      toast('Please enter a valid payment amount greater than 0', 'error');
      return;
    }

    setPaymentForms(prev => ({
      ...prev,
      [className]: { ...form, submitting: true },
    }));

    try {
      const targetMonth =
        selectedMonth === 'all'
          ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
          : selectedMonth;

      const res = await fetch('/api/class-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          class_name: className,
          month: targetMonth,
          amount: amtNum,
          payment_mode: form.mode,
          payment_date: form.date,
          notes: form.notes,
        }),
      });

      if (res.ok) {
        toast(
          `Payment of ₹${amtNum.toLocaleString('en-IN')} (${form.mode}) recorded for "${className}"! Devangi balance updated.`,
          'success'
        );
        setPaymentForms(prev => ({
          ...prev,
          [className]: {
            amount: '',
            mode: form.mode,
            date: new Date().toISOString().split('T')[0],
            notes: '',
            submitting: false,
          },
        }));
        fetchPaymentsSummary();
        fetchDevangiBalance();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to record payment', 'error');
        setPaymentForms(prev => ({
          ...prev,
          [className]: { ...form, submitting: false },
        }));
      }
    } catch {
      toast('Failed to record payment', 'error');
      setPaymentForms(prev => ({
        ...prev,
        [className]: { ...form, submitting: false },
      }));
    }
  };

  // Delete a recorded class payment
  const handleDeletePayment = async (paymentId: string, className: string) => {
    if (
      !confirm(
        `Are you sure you want to delete this payment record for "${className}"? The amount will be deducted from Devangi's balance.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/class-payments?id=${paymentId}`, { method: 'DELETE' });
      if (res.ok) {
        toast(`Payment deleted for "${className}". Devangi balance updated.`, 'info');
        fetchPaymentsSummary();
        fetchDevangiBalance();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to delete payment', 'error');
      }
    } catch {
      toast('Failed to delete payment', 'error');
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

          {(role === 'admin' || role === 'devangi') && (
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

      {/* Devangi Live Available Balance Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-900/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30 shadow-inner">
            <Wallet className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">Devangi's Live Balance</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Auto-Updated
              </span>
            </div>
            <span className="text-xs text-indigo-200/70 block">
              Directly credited when class fees are received via Cash or Online
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-xs font-bold sm:flex sm:items-center sm:gap-3">
          <div className="p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-white/5 border border-amber-500/30 text-left">
            <div className="flex items-center gap-1.5 text-amber-400 mb-0.5">
              <Banknote className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Available Cash</span>
            </div>
            <span className="text-white font-black text-base sm:text-lg">
              ₹{Number(devangiBalance?.available_cash || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-white/5 border border-sky-500/30 text-left">
            <div className="flex items-center gap-1.5 text-sky-400 mb-0.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Available Online</span>
            </div>
            <span className="text-white font-black text-base sm:text-lg">
              ₹{Number(devangiBalance?.available_online || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-left">
            <div className="flex items-center gap-1.5 text-indigo-300 mb-0.5">
              <Wallet className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Available</span>
            </div>
            <span className="text-emerald-400 font-black text-base sm:text-lg">
              ₹{Number(devangiBalance?.total_available || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: Monthly Individual Class Fees & Payment Status */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-100">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                  Monthly Individual Class Fees & Payment Status
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {selectedMonth === 'all' ? 'All Months (Lifetime)' : format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter amount paid via Cash or Online • Automatically identifies Full Paid or Pending In Balance • Credits Devangi's Balance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentsSection(!showPaymentsSection)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all self-start sm:self-auto"
          >
            {showPaymentsSection ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Hide Fee Status</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Show Fee Status</span>
              </>
            )}
          </button>
        </div>

        {showPaymentsSection && (
          <div className="space-y-6">
            {/* Monthly Overall Summary KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Monthly Record
                </span>
                <h4 className="text-xl font-black text-slate-800 mt-0.5">
                  ₹{paymentsTotals.total_billed.toLocaleString('en-IN')}
                </h4>
                <span className="text-[11px] text-slate-500 block">Total fees from sessions</span>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Total Amount Paid
                </span>
                <h4 className="text-xl font-black text-emerald-700 mt-0.5">
                  ₹{paymentsTotals.total_paid.toLocaleString('en-IN')}
                </h4>
                <span className="text-[11px] text-emerald-600/90 block">
                  💵 ₹{paymentsTotals.total_cash_paid.toLocaleString('en-IN')} Cash • 📱 ₹{paymentsTotals.total_online_paid.toLocaleString('en-IN')} Online
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/70">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  Remaining In Balance
                </span>
                <h4 className="text-xl font-black text-amber-700 mt-0.5">
                  ₹{paymentsTotals.total_balance_due.toLocaleString('en-IN')}
                </h4>
                <span className="text-[11px] text-amber-600/90 block">Pending to be paid</span>
              </div>

              <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-200/70 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Payment Status Counts
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 {paymentsTotals.full_paid_count} Full Paid
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                    🟡 {paymentsTotals.pending_count} In Balance
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Classes Payment Cards */}
            {loadingPayments ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <p className="text-xs text-slate-400">Loading individual class fee statuses...</p>
              </div>
            ) : monthlyClassesSummary.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/70 text-center text-xs text-slate-500">
                No individual classes found for this month.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {monthlyClassesSummary.map(cls => {
                  const form = getPaymentForm(cls.class_name, cls.balance_due);
                  const isHistoryExpanded = !!expandedPaymentHistory[cls.class_name];

                  return (
                    <div
                      key={cls.class_name}
                      className={`p-5 rounded-3xl border transition-all space-y-4 ${
                        cls.status === 'full_paid'
                          ? 'bg-gradient-to-br from-white to-emerald-50/20 border-emerald-200/90 shadow-2xs'
                          : cls.status === 'in_balance'
                          ? 'bg-gradient-to-br from-white to-amber-50/20 border-amber-200/90 shadow-2xs'
                          : cls.status === 'pending'
                          ? 'bg-gradient-to-br from-white to-rose-50/20 border-rose-200/80 shadow-2xs'
                          : 'bg-white border-slate-200/80'
                      }`}
                    >
                      {/* Top Header of Class Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-800">{cls.class_name}</h3>
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {cls.monthly_records_count} session{cls.monthly_records_count === 1 ? '' : 's'} • {cls.monthly_hours} hrs taught
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {cls.status === 'full_paid' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Full Paid</span>
                            </span>
                          )}
                          {cls.status === 'in_balance' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>₹{cls.balance_due.toLocaleString('en-IN')} In Balance</span>
                            </span>
                          )}
                          {cls.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Pending • ₹{cls.balance_due.toLocaleString('en-IN')} In Balance</span>
                            </span>
                          )}
                          {cls.status === 'overpaid' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Full Paid (Advance ₹{(cls.total_paid - cls.total_billed).toLocaleString('en-IN')})</span>
                            </span>
                          )}
                          {cls.status === 'no_classes' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              No Classes This Month
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amounts Strip */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Record Total</span>
                          <span className="text-sm font-black text-slate-800 block">
                            ₹{cls.total_billed.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Amount Paid</span>
                          <span className="text-sm font-black text-emerald-700 block">
                            ₹{cls.total_paid.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Cash: ₹{cls.cash_paid} • Online: ₹{cls.online_paid}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-600 block">In Balance</span>
                          <span className="text-sm font-black text-amber-700 block">
                            ₹{cls.balance_due.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Payment Entrance Field Form */}
                      <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Enter Amount Paid for {cls.class_name}</span>
                          </span>

                          {cls.balance_due > 0 && (
                            <button
                              type="button"
                              onClick={() => updatePaymentFormField(cls.class_name, 'amount', String(cls.balance_due), cls.balance_due)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs transition-all"
                            >
                              ⚡ Pay Full (₹{cls.balance_due.toLocaleString('en-IN')})
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          {/* Amount Input */}
                          <div className="sm:col-span-4 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="1"
                              placeholder="Amount Paid"
                              value={form.amount}
                              onChange={e => updatePaymentFormField(cls.class_name, 'amount', e.target.value, cls.balance_due)}
                              className="w-full pl-7 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Cash / Online Toggle */}
                          <div className="sm:col-span-4 grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => updatePaymentFormField(cls.class_name, 'mode', 'Cash', cls.balance_due)}
                              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                form.mode === 'Cash'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-200/60'
                              }`}
                            >
                              <Banknote className="w-3 h-3" />
                              <span>Cash</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updatePaymentFormField(cls.class_name, 'mode', 'Online', cls.balance_due)}
                              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                form.mode === 'Online'
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-200/60'
                              }`}
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Online</span>
                            </button>
                          </div>

                          {/* Date input */}
                          <div className="sm:col-span-4">
                            <input
                              type="date"
                              value={form.date}
                              onChange={e => updatePaymentFormField(cls.class_name, 'date', e.target.value, cls.balance_due)}
                              className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {/* Optional Notes and Submit Button */}
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <input
                            type="text"
                            placeholder="Payment notes (e.g. October full fee, GPay ref)"
                            value={form.notes}
                            onChange={e => updatePaymentFormField(cls.class_name, 'notes', e.target.value, cls.balance_due)}
                            className="w-full sm:flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                          <button
                            type="button"
                            disabled={form.submitting}
                            onClick={() => handleRecordPayment(cls.class_name, cls.class_id, cls.balance_due)}
                            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                          >
                            {form.submitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Record Payment</span>
                          </button>
                        </div>
                      </div>

                      {/* Payment History Toggle & Accordion */}
                      {cls.payments && cls.payments.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPaymentHistory(prev => ({
                                ...prev,
                                [cls.class_name]: !prev[cls.class_name],
                              }))
                            }
                            className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                          >
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {isHistoryExpanded ? 'Hide' : 'View'} Payment History ({cls.payments.length})
                            </span>
                            {isHistoryExpanded ? (
                              <ChevronUp className="w-3 h-3 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                            )}
                          </button>

                          {isHistoryExpanded && (
                            <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1 animate-in fade-in">
                              {cls.payments.map(p => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        p.payment_mode === 'Cash'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-indigo-100 text-indigo-800'
                                      }`}
                                    >
                                      {p.payment_mode === 'Cash' ? '💵 Cash' : '📱 Online'}
                                    </span>
                                    <div>
                                      <span className="font-bold text-slate-800">
                                        ₹{Number(p.amount).toLocaleString('en-IN')}
                                      </span>
                                      <span className="text-[10px] text-slate-400 ml-2">
                                        {p.payment_date}
                                      </span>
                                      {p.notes && (
                                        <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                                          {p.notes}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(p.id, cls.class_name)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Delete payment record (deducts from Devangi balance)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
                  {classesList
                    .filter(c => c.is_active !== false)
                    .map(c => (
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

          {/* Classes & Multi-Subject Rate Configurations */}
          {(role === 'admin' || role === 'devangi') && (
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900">{c.name}</span>
                            {c.is_active === false ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                                Deactivated
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Active
                              </span>
                            )}
                          </div>
                          {c.description && (
                            <span className="text-[11px] text-slate-400 block">{c.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Deactivate / Reactivate button */}
                          <button
                            type="button"
                            onClick={() => handleToggleClassActive(c)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all border ${
                              c.is_active === false
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                            }`}
                            title={
                              c.is_active === false
                                ? 'Reactivate class to appear in daily dropdowns'
                                : 'Deactivate class (stops teaching there - hidden from daily dropdowns)'
                            }
                          >
                            {c.is_active === false ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Reactivate</span>
                              </>
                            ) : (
                              <>
                                <Power className="w-3 h-3 text-amber-600" />
                                <span>Deactivate</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenEditClassModal(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Class"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {role === 'admin' && (
                            <button
                              onClick={() => handleDeleteClass(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                    {c.name}{c.is_active === false ? ' (Deactivated)' : ''}
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
