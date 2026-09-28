'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

export default function ExcelImportPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [classList, setClassList] = useState<{ id: string; name: string; hourly_rate: number }[]>([]);

  // Only Admin has Excel Import access
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/classes')
        .then(res => res.json())
        .then(data => setClassList(data.classes || []))
        .catch(err => console.error(err));
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Admin Only Area</h2>
        <p className="text-sm text-slate-500">Excel Data Import is restricted to the Admin user.</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast('Please choose an Excel file (.xlsx or .xls)', 'error');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/classes/upload-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        toast(data.message || 'Excel imported successfully!', 'success');
      } else {
        toast(data.error || 'Failed to process Excel file', 'error');
        setResult({ error: data.error, errors: data.errors });
      }
    } catch (err: any) {
      toast('Failed to process Excel', 'error');
      setResult({ error: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent(
        'Class Name,Date,From Time,To Time,Hours\n' +
          'Maths,2026-09-01,05:00 PM,07:00 PM,2\n' +
          'Physics,2026-09-02,06:00 PM,07:30 PM,1.5\n' +
          'Chemistry,2026-09-03,04:00 PM,06:00 PM,2\n'
      );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'classes_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-100">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Import Historical Classes Excel
            </h1>
            <p className="text-xs text-slate-500">
              Upload past months of classes data in batch without manual re-entry
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadSample}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download Sample Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Box */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleUpload}
            className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors shadow-sm text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {file ? file.name : 'Select or Drop your Excel File'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Supports Microsoft Excel files (.xlsx, .xls)
              </p>
            </div>

            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              id="excel-file-input"
              className="hidden"
            />

            <div className="flex justify-center gap-3">
              <label
                htmlFor="excel-file-input"
                className="cursor-pointer px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Browse File
              </label>

              {file && (
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileCheck className="w-4 h-4" />
                  )}
                  <span>Process & Import</span>
                </button>
              )}
            </div>
          </form>

          {/* Import Results Banner */}
          {result && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                {result.errorsCount === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-slate-800 text-base">Import Results</h4>
                  <p className="text-xs text-slate-600">{result.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-center">
                <div className="p-3 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Processed
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    {result.totalProcessed || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">
                    Imported
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    {result.importedCount || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50">
                  <span className="text-[10px] text-amber-600 uppercase font-bold block">
                    Duplicates Skipped
                  </span>
                  <span className="text-xl font-black text-amber-700">
                    {result.skippedDuplicateCount || 0}
                  </span>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-rose-600 block">
                    Row-level Errors ({result.errors.length}):
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                    {result.errors.map((err: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 flex items-center justify-between"
                      >
                        <span className="font-semibold">Row {err.row}:</span>
                        <span className="text-rose-700 text-right">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Link
                  href="/classes"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700"
                >
                  <span>Go to Classes Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Info Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <h4 className="font-bold text-sm text-slate-800">Requirements & Rules</h4>

          <div className="space-y-3 text-xs text-slate-600">
            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong>Class Name must exist:</strong> Each class row in the Excel must match an
                existing Admin class definition.
              </span>
            </p>

            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong>Duplicate Prevention:</strong> If the exact same class, date, and timing was
                already uploaded, the system will safely skip it to prevent double counting.
              </span>
            </p>

            <p className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <span>
                <strong>Instant Reflection:</strong> After upload, Devangi's Classes dashboard and
                monthly reports will immediately show all historical earnings and records.
              </span>
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">
              Configured Classes in System:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {classList.map(c => (
                <span
                  key={c.id}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[11px]"
                >
                  {c.name} (₹{c.hourly_rate}/hr)
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
