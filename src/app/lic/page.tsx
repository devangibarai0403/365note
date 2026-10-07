'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ShieldCheck,
  Plus,
  CalendarClock,
  Loader2,
  X,
  Check,
  Trash2,
  PenLine,
  ToggleLeft,
  ToggleRight,
  Info,
  AlertCircle,
  Banknote,
  RefreshCw,
} from 'lucide-react';

interface LicDeduction {
  id: string;
  user_id: string;
  amount: number;
  deduction_day: number;
  label: string;
  is_active: boolean;
  last_processed_month: string | null;
  created_at: string;
}

export default function LicPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [deductions, setDeductions] = useState<LicDeduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDed, setEditingDed] = useState<LicDeduction | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formDay, setFormDay] = useState('1');
  const [formLabel, setFormLabel] = useState('LIC Premium');
  const [saving, setSaving] = useState(false);

  const fetchDeductions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/lic-deductions?user_id=devangi');
      if (res.ok) {
        const data = await res.json();
        setDeductions(data.deductions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const processDeductions = useCallback(async (manual = false) => {
    try {
      setProcessing(true);
      const res = await fetch('/api/lic-deductions/process', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.processed && data.processed.length > 0) {
          toast(`LIC auto-deducted: ${data.processed.join(', ')}`, 'success');
          fetchDeductions();
        } else if (manual) {
          toast('No pending deductions for this month', 'info');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }, [fetchDeductions, toast]);

  useEffect(() => {
    fetchDeductions();
    processDeductions(false);
  }, [fetchDeductions, processDeductions]);

  const handleOpenModal = (ded?: LicDeduction) => {
    if (ded) {
      setEditingDed(ded);
      setFormAmount(String(ded.amount));
      setFormDay(String(ded.deduction_day));
      setFormLabel(ded.label);
    } else {
      setEditingDed(null);
      setFormAmount('');
      setFormDay('1');
      setFormLabel('LIC Premium');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      toast('Please enter a valid amount', 'error');
      return;
    }
    const day = Number(formDay);
    if (!day || day < 1 || day > 28) {
      toast('Day must be between 1 and 28', 'error');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        amount: Number(formAmount),
        deduction_day: day,
        label: formLabel.trim() || 'LIC Premium',
        is_active: true,
        for_user: 'devangi',
      };
      if (editingDed) body.id = editingDed.id;

      const res = await fetch('/api/lic-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast(editingDed ? 'LIC deduction updated!' : 'LIC deduction added!', 'success');
        setIsModalOpen(false);
        fetchDeductions();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save', 'error');
      }
    } catch {
      toast('Failed to save LIC deduction', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ded: LicDeduction) => {
    try {
      const res = await fetch('/api/lic-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ded.id,
          amount: ded.amount,
          deduction_day: ded.deduction_day,
          label: ded.label,
          is_active: !ded.is_active,
          for_user: 'devangi',
        }),
      });
      if (res.ok) {
        toast(`LIC deduction ${!ded.is_active ? 'activated' : 'paused'}`, 'info');
        fetchDeductions();
      }
    } catch {
      toast('Failed to update', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this LIC deduction setting?')) return;
    try {
      const res = await fetch(`/api/lic-deductions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('LIC deduction removed', 'info');
        fetchDeductions();
      }
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  // Today info
  const today = new Date();
  const todayDay = today.getDate();
  const currentMonth = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const totalMonthlyLic = deductions.filter(d => d.is_active).reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-md shadow-violet-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">LIC Deduction</h1>
            <p className="text-xs text-slate-500">Monthly auto-deduction from Devangi&apos;s Online balance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => processDeductions(true)}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${processing ? 'animate-spin' : ''}`} />
            <span>Process Now</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-200 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deduction</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-violet-800/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-violet-500/20">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-300 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Total Monthly LIC</span>
            </div>
            <div className="text-3xl font-black text-white mt-1">
              &#8377;{totalMonthlyLic.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-violet-300/60 mt-1">Combined active deductions / month</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-violet-500/20">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-300 mb-1">
              <CalendarClock className="w-4 h-4" />
              <span>Current Month</span>
            </div>
            <div className="text-xl font-black text-white mt-1">{currentMonth}</div>
            <p className="text-[11px] text-violet-300/60 mt-1">Today is day <span className="text-white font-bold">{todayDay}</span></p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-violet-500/20">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-300 mb-1">
              <Banknote className="w-4 h-4" />
              <span>Active Deductions</span>
            </div>
            <div className="text-3xl font-black text-white mt-1">{deductions.filter(d => d.is_active).length}</div>
            <p className="text-[11px] text-violet-300/60 mt-1">{deductions.length} total configured</p>
          </div>
        </div>
      </div>

      {/* How It Works Info Box */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 flex gap-4">
        <Info className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-violet-900 space-y-1">
          <p className="font-bold">How auto-deduction works:</p>
          <ul className="text-xs space-y-1 text-violet-800/80 list-disc list-inside">
            <li>Set an amount and deduction day of the month (e.g., day 5 = every 5th).</li>
            <li><strong>Runs once every day at midnight (12:00 AM IST)</strong> in the database — <strong>even if the website is not opened</strong>.</li>
            <li>When the date matches the entered date, the amount is automatically deducted from Devangi&apos;s <strong>Online balance</strong>.</li>
            <li>Appears in Family Money as a <strong>Sent &rarr; Online &rarr; LIC</strong> transaction.</li>
            <li>Deducted <strong>only once per month</strong> — no duplicate deductions.</li>
            <li>You can also click <strong>&quot;Process Now&quot;</strong> anytime to manually trigger it.</li>
          </ul>
        </div>
      </div>

      {/* Deductions Grid */}
      <div>
        <h2 className="font-bold text-slate-700 text-sm mb-4">Configured Deductions</h2>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 py-10 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : deductions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-600 text-sm">No LIC deductions yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-5">Add a recurring monthly LIC premium to auto-deduct from Devangi&apos;s Online balance</p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Deduction
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deductions.map(ded => {
              const isPending = ded.is_active && todayDay >= ded.deduction_day &&
                ded.last_processed_month !== `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
              return (
                <div
                  key={ded.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                    ded.is_active
                      ? 'border-violet-200 hover:border-violet-400 hover:shadow-md'
                      : 'border-slate-200 opacity-60'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <p className="font-black text-slate-800 text-base">{ded.label}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <CalendarClock className="w-3 h-3 text-violet-500" />
                        <span className="text-[11px] text-slate-500">
                          Every month on day <span className="font-bold text-violet-700">{ded.deduction_day}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        ded.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {ded.is_active ? 'Active' : 'Paused'}
                      </span>
                      {isPending && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-3xl font-black text-violet-700 mb-3">
                    &#8377;{Number(ded.amount).toLocaleString('en-IN')}
                    <span className="text-xs font-semibold text-slate-400 ml-1">/ month</span>
                  </div>

                  {/* Last processed */}
                  <p className="text-[11px] text-slate-400 mb-4">
                    {ded.last_processed_month
                      ? `Last deducted: ${ded.last_processed_month}`
                      : 'Not yet processed'}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleToggle(ded)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                        ded.is_active
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {ded.is_active
                        ? <><ToggleRight className="w-4 h-4" /> Active</>
                        : <><ToggleLeft className="w-4 h-4" /> Paused</>}
                    </button>
                    <button
                      onClick={() => handleOpenModal(ded)}
                      className="p-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-600 transition-all"
                      title="Edit"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ded.id)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">{editingDed ? 'Edit' : 'Add'} LIC Deduction</h3>
                  <p className="text-xs text-slate-400">Monthly auto-deduction from Devangi&apos;s Online balance</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Label / Policy Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. LIC Premium, Life Insurance"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Monthly Amount (&#8377;) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">&#8377;</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 3500"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Deduction Day of Month (1–28) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  placeholder="e.g. 5"
                  value={formDay}
                  onChange={e => setFormDay(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-[11px] text-slate-400 mt-1.5 block">
                  Deduction fires on or after this day each month. Max 28 to work across all months.
                </span>
              </div>

              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3.5 text-xs text-violet-900 leading-relaxed">
                &#x1F6E1;&#xFE0F; <span className="font-semibold">Deducted from Online balance.</span> Shows up as Sent &#x2192; LIC in Family Money.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-100 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingDed ? 'Update' : 'Save'} Deduction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
