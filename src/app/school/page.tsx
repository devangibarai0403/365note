'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { SchoolItem, SchoolDailyStatus } from '@/types';
import { AttendanceCalendar, AttendanceRecord } from '@/components/AttendanceCalendar';
import { MonthlySalaryCard } from '@/components/MonthlySalaryCard';
import { format } from 'date-fns';
import {
  School as SchoolIcon,
  Plus,
  FileText,
  Upload,
  Calendar,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building,
  Edit2,
} from 'lucide-react';

export default function SchoolPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [statuses, setStatuses] = useState<SchoolDailyStatus[]>([]);
  const [salaryRefreshKey, setSalaryRefreshKey] = useState(0);

  // Admin School Modal (Add / Edit)
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolSalary, setSchoolSalary] = useState('');
  const [paidLeavesDays, setPaidLeavesDays] = useState('');
  const [perLeaveCut, setPerLeaveCut] = useState('');
  const [schoolJoiningDate, setSchoolJoiningDate] = useState('');
  const [schoolNotes, setSchoolNotes] = useState('');
  const [savingSchool, setSavingSchool] = useState(false);

  // Document Upload Modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('Offer Letter');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Route protection
  const isShrikesh = role === 'shrikesh';

  // 1. Fetch schools list
  const fetchSchools = useCallback(async () => {
    try {
      const res = await fetch('/api/schools');
      if (res.ok) {
        const data = await res.json();
        setSchools(data.schools || []);
        if (data.schools?.length > 0 && !selectedSchoolId) {
          setSelectedSchoolId(data.schools[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedSchoolId]);

  // 2. Fetch daily attendance for selected school & month
  const fetchAttendance = useCallback(async () => {
    if (!selectedSchoolId) return;
    try {
      setLoading(true);
      const monthStr = format(currentMonth, 'yyyy-MM');
      const res = await fetch(`/api/schools/status?school_id=${selectedSchoolId}&month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setStatuses(data.statuses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolId, currentMonth]);

  useEffect(() => {
    if (!isShrikesh) {
      fetchSchools();
    }
  }, [fetchSchools, isShrikesh]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchAttendance();
    }
  }, [selectedSchoolId, currentMonth, fetchAttendance]);

  if (isShrikesh) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500">School section is exclusively for Devangi and Admin.</p>
      </div>
    );
  }

  // Handle Save Attendance Status
  const handleSaveStatus = async (date: string, status: string, note?: string) => {
    if (!selectedSchoolId) return;
    try {
      const res = await fetch('/api/schools/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: selectedSchoolId,
          status_date: date,
          status,
          note,
        }),
      });

      if (res.ok) {
        toast(status === 'clear' ? `School status removed: ${date}` : `Attendance marked: ${date}`, 'success');
        fetchAttendance();
        setSalaryRefreshKey(k => k + 1);
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save attendance', 'error');
      }
    } catch {
      toast('Failed to save attendance', 'error');
    }
  };

  // Open Add School Modal
  const handleOpenAddSchool = () => {
    setEditingSchoolId(null);
    setSchoolName('');
    setSchoolSalary('');
    setPaidLeavesDays('');
    setPerLeaveCut('');
    setSchoolJoiningDate('');
    setSchoolNotes('');
    setShowSchoolModal(true);
  };

  // Open Edit School Modal
  const handleOpenEditSchool = (s: SchoolItem) => {
    setEditingSchoolId(s.id);
    setSchoolName(s.name);
    setSchoolSalary(s.monthly_salary ? String(s.monthly_salary) : '');
    setPaidLeavesDays(s.paid_leaves_days !== undefined ? String(s.paid_leaves_days) : '0');
    setPerLeaveCut(s.per_leave_cut !== undefined ? String(s.per_leave_cut) : '');
    setSchoolJoiningDate(s.joining_date || '');
    setSchoolNotes(s.notes || '');
    setShowSchoolModal(true);
  };

  // Handle Save School (Create or Update)
  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName) return;

    setSavingSchool(true);
    try {
      const isEdit = Boolean(editingSchoolId);
      const url = '/api/schools';
      const method = isEdit ? 'PUT' : 'POST';
      const payload: any = {
        name: schoolName,
        monthly_salary: Number(schoolSalary || 0),
        paid_leaves_days: Number(paidLeavesDays || 0),
        per_leave_cut: Number(perLeaveCut || 0),
        joining_date: schoolJoiningDate || null,
        notes: schoolNotes || null,
      };

      if (isEdit) {
        payload.id = editingSchoolId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast(isEdit ? `School "${schoolName}" updated successfully!` : `School "${schoolName}" created successfully!`, 'success');
        setShowSchoolModal(false);
        await fetchSchools();
        if (data.school?.id) {
          setSelectedSchoolId(data.school.id);
        }
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save school', 'error');
      }
    } catch {
      toast('Failed to save school', 'error');
    } finally {
      setSavingSchool(false);
    }
  };

  // Handle Document Upload to Vercel Blob
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !selectedFile || !docTitle) {
      toast('Please choose a file and title', 'error');
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('school_id', selectedSchoolId);
      formData.append('document_title', docTitle);
      formData.append('document_type', docType);

      const res = await fetch('/api/schools/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast('Document uploaded to Vercel Blob successfully!', 'success');
        setShowDocModal(false);
        setDocTitle('');
        setSelectedFile(null);
        fetchSchools();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to upload document', 'error');
      }
    } catch {
      toast('Document upload failed', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handle Delete Document
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document from Vercel Blob?')) return;
    try {
      const res = await fetch(`/api/schools/documents?id=${docId}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Document removed', 'info');
        fetchSchools();
      }
    } catch {
      toast('Failed to delete document', 'error');
    }
  };

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  // Format attendance records for Calendar component
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-100">
            <SchoolIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">School Management</h1>
            <p className="text-xs text-slate-500">
              Devangi's attendance (🟢 Working, 🟡 School Leave, 🔴 Leave Taken), salary & Vercel Blob documents
            </p>
          </div>
        </div>

        {role === 'admin' && (
          <button
            onClick={handleOpenAddSchool}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add School</span>
          </button>
        )}
      </div>

      {/* School Selector & Info Card */}
      {schools.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3">
          <Building className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700">No Schools Added Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {role === 'admin'
              ? 'Click "Add School" above to set up a school with salary, paid leaves, and document storage.'
              : 'Admin has not added any school records yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* School Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <span className="text-xs font-bold uppercase text-slate-400 mr-2">Select School:</span>
            {schools.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSchoolId(s.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  selectedSchoolId === s.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Selected School Details & Documents Strip */}
          {selectedSchool && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Salary & Leave Policy Info */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                      Salary & Leave Policy
                    </span>
                    {role === 'admin' && (
                      <button
                        onClick={() => handleOpenEditSchool(selectedSchool)}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Edit Salary & Leaves"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div>
                      <span className="text-xs text-slate-400">Monthly Base Salary:</span>
                      <span className="text-xl font-black text-emerald-700 block">
                        ₹{Number(selectedSchool.monthly_salary || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paid Leaves</span>
                        <span className="text-sm font-extrabold text-slate-700 block">
                          {Number(selectedSchool.paid_leaves_days || 0)} d / mo
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Per Leave Cut</span>
                        <span className="text-sm font-extrabold text-rose-600 block">
                          ₹{Number(selectedSchool.per_leave_cut || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    {selectedSchool.joining_date && (
                      <span className="text-[11px] text-slate-400 pt-1 block">
                        Joined: {selectedSchool.joining_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents & Vercel Blob Storage */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase text-slate-700">
                      School Documents ({selectedSchool.documents?.length || 0})
                    </span>
                  </div>

                  {role === 'admin' && (
                    <button
                      onClick={() => setShowDocModal(true)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Document (Blob)</span>
                    </button>
                  )}
                </div>

                {selectedSchool.documents && selectedSchool.documents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedSchool.documents.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1"
                        >
                          <span>{doc.document_title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                        <span className="text-[10px] text-slate-400">({doc.document_type})</span>

                        {role === 'admin' && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No documents uploaded yet (Offer Letter, Joining Letter, etc. stored on Vercel Blob).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Monthly Received Salary & Carry-Over Balance */}
          <MonthlySalaryCard
            key={`school-salary-${selectedSchoolId}-${salaryRefreshKey}`}
            type="school"
            schoolId={selectedSchoolId}
            currentMonth={currentMonth}
            onSalaryChanged={() => {
              fetchAttendance();
              setSalaryRefreshKey(k => k + 1);
            }}
            userRole={role}
          />

          {/* Interactive Attendance Calendar Component */}
          <AttendanceCalendar
            type="school"
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            records={calendarRecords}
            onSaveStatus={handleSaveStatus}
            monthlySalary={Number(selectedSchool?.monthly_salary || 0)}
            paidLeavesDays={Number(selectedSchool?.paid_leaves_days || 0)}
            perLeaveCut={Number(selectedSchool?.per_leave_cut || 0)}
          />
        </div>
      )}

      {/* Admin Add / Edit School Modal */}
      {showSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-600">Admin Control</span>
              <h3 className="text-lg font-bold text-slate-800">
                {editingSchoolId ? 'Edit School Settings' : 'Add New School'}
              </h3>
              <p className="text-xs text-slate-400">Configure salary, paid leaves, and leave penalty for Devangi.</p>
            </div>

            <form onSubmit={handleSaveSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. St. Xavier High School"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Monthly Base Salary (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="45000"
                  value={schoolSalary}
                  onChange={e => setSchoolSalary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                    Paid Leaves / Mo (Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 2"
                    value={paidLeavesDays}
                    onChange={e => setPaidLeavesDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                    Per Leave Salary Cut (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1500 (or 0 for calc)"
                    value={perLeaveCut}
                    onChange={e => setPerLeaveCut(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={schoolJoiningDate}
                    onChange={e => setSchoolJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Designation, grades, etc."
                    value={schoolNotes}
                    onChange={e => setSchoolNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSchoolModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchool}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingSchool && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSchoolId ? 'Save Changes' : 'Save School'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Upload Document to Vercel Blob Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div>
              <span className="text-xs uppercase font-bold text-indigo-600">Vercel Blob Storage</span>
              <h3 className="text-lg font-bold text-slate-800">Upload School Document</h3>
              <p className="text-xs text-slate-400">
                Uploaded files are stored safely in Vercel Blob and linked with {selectedSchool?.name}.
              </p>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024 Offer Letter, Joining Letter"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Document Type *
                </label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Joining Letter">Joining Letter</option>
                  <option value="ID Card / Document">ID Card / Document</option>
                  <option value="Salary Slip / Agreement">Salary Slip / Agreement</option>
                  <option value="Other School Document">Other School Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Select File (PDF, Image, DOC) *
                </label>
                <input
                  type="file"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingDoc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Upload to Blob</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
