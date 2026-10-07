'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Wallet,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ArrowRight,
  Sparkles,
  Check,
  X,
  History,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { PaymentMode, SalaryPayment } from '@/types';

interface MonthlySalaryCardProps {
  type: 'school' | 'office';
  schoolId?: string;
  currentMonth: Date;
  onSalaryChanged?: () => void;
  userRole?: string | null;
}

export const MonthlySalaryCard: React.FC<MonthlySalaryCardProps> = ({
  type,
  schoolId,
  currentMonth,
  onSalaryChanged,
  userRole,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any | null>(null);

  // Live balance
  const targetUser = type === 'school' ? 'devangi' : 'shrikesh';
  const [userBalance, setUserBalance] = useState<{ available_cash: number; available_online: number; total_available: number } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalaryPayment | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [modeInput, setModeInput] = useState<PaymentMode>('Online');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const monthStr = format(currentMonth, 'yyyy-MM');
  const monthDisplay = format(currentMonth, 'MMMM yyyy');

  // Fetch salary summary & payments
  const fetchSalaryData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/salary-payments?type=${type}&month=${monthStr}`;
      if (type === 'school' && schoolId) {
        url += `&school_id=${schoolId}`;
      }

      const [resSal, resBal] = await Promise.all([
        fetch(url),
        fetch(`/api/balance?user_id=${targetUser}`),
      ]);

      if (resSal.ok) {
        const data = await resSal.json();
        setSummary(data.summary);
      }
      if (resBal.ok) {
        const balData = await resBal.json();
        if (balData.balance) {
          setUserBalance({
            available_cash: Number(balData.balance.available_cash || 0),
            available_online: Number(balData.balance.available_online || 0),
            total_available: Number(balData.balance.total_available || 0),
          });
        }
      }
    } catch (e) {
      console.error('Fetch salary summary error:', e);
    } finally {
      setLoading(false);
    }
  }, [type, schoolId, monthStr, targetUser]);

  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  // Open modal to add payment
  const handleOpenAddModal = (presetAmount?: number) => {
    setEditingPayment(null);
    if (presetAmount !== undefined && presetAmount > 0) {
      setAmountInput(String(presetAmount));
    } else if (summary && summary.balance_remaining > 0) {
      setAmountInput(String(summary.balance_remaining));
    } else if (summary && summary.total_receivable > 0) {
      setAmountInput(String(summary.total_receivable));
    } else {
      setAmountInput('');
    }
    setModeInput('Online');
    setDateInput(new Date().toISOString().split('T')[0]);
    setNotesInput(summary?.previous_balance > 0 ? `Includes ₹${summary.previous_balance} previous balance` : '');
    setIsModalOpen(true);
  };

  // Open modal to edit existing payment
  const handleOpenEditModal = (p: SalaryPayment) => {
    setEditingPayment(p);
    setAmountInput(String(p.amount));
    setModeInput(p.payment_mode);
    setDateInput(p.payment_date);
    setNotesInput(p.notes || '');
    setIsModalOpen(true);
  };

  // Submit payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amountInput);
    if (isNaN(amt) || amt <= 0) {
      toast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPayment) {
        const res = await fetch('/api/salary-payments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPayment.id,
            amount: amt,
            payment_mode: modeInput,
            payment_date: dateInput,
            notes: notesInput.trim() || undefined,
          }),
        });

        if (res.ok) {
          toast(`Salary payment updated: ₹${amt.toLocaleString('en-IN')}`, 'success');
          setIsModalOpen(false);
          await fetchSalaryData();
          onSalaryChanged?.();
        } else {
          const err = await res.json();
          toast(err.error || 'Failed to update salary payment', 'error');
        }
      } else {
        const res = await fetch('/api/salary-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            school_id: schoolId || undefined,
            month: monthStr,
            amount: amt,
            payment_mode: modeInput,
            payment_date: dateInput,
            notes: notesInput.trim() || undefined,
          }),
        });

        if (res.ok) {
          toast(`Salary payment recorded: ₹${amt.toLocaleString('en-IN')} (${modeInput})! Balance updated.`, 'success');
          setIsModalOpen(false);
          await fetchSalaryData();
          onSalaryChanged?.();
        } else {
          const err = await res.json();
          toast(err.error || 'Failed to record salary payment', 'error');
        }
      }
    } catch {
      toast('Failed to record salary payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete payment
  const handleDeletePayment = async (id: string, amt: number) => {
    if (!confirm(`Are you sure you want to delete this payment of ₹${amt.toLocaleString('en-IN')}? This will update your balance.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/salary-payments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast(`Payment removed. Balance updated.`, 'info');
        await fetchSalaryData();
        onSalaryChanged?.();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to delete payment', 'error');
      }
    } catch {
      toast('Failed to delete payment', 'error');
    }
  };

  const baseSalary = Number(summary?.base_salary || 0);
  const netEstimatedSalary = Number(summary?.net_estimated_salary || 0);
  const previousBalance = Number(summary?.previous_balance || 0);
  const totalReceivable = Number(summary?.total_receivable || 0);
  const totalReceived = Number(summary?.total_received || 0);
  const balanceRemaining = Number(summary?.balance_remaining || 0);
  const isBalanced = summary?.is_balanced || false;
  const payments: SalaryPayment[] = summary?.payments || [];

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6 animate-in fade-in">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-100">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {type === 'school' ? "Devangi's School Salary & Balance" : "Shrikesh's Office Salary & Balance"}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {monthDisplay}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Track expected monthly net salary, previous carried dues, received payments & live balance
            </p>
          </div>
        </div>

        {/* Live Balance Widget & Status */}
        <div className="flex flex-wrap items-center gap-3">
          {userBalance && (
            <div className="px-3.5 py-2 rounded-2xl bg-slate-900 text-white text-xs shadow-sm flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {targetUser === 'devangi' ? 'Devangi' : 'Shrikesh'} Balance:
              </span>
              <span className="font-extrabold text-emerald-400 text-sm">
                ₹{userBalance.total_available.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400">
                (Cash: ₹{userBalance.available_cash.toLocaleString('en-IN')} | Online: ₹{userBalance.available_online.toLocaleString('en-IN')})
              </span>
            </div>
          )}

          {/* Status Badge */}
          {totalReceived === 0 ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Received</span>
            </span>
          ) : isBalanced ? (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fully Balanced (₹0 Due)</span>
            </span>
          ) : balanceRemaining > 0 ? (
            <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>₹{balanceRemaining.toLocaleString('en-IN')} Due / Unpaid</span>
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>+₹{Math.abs(balanceRemaining).toLocaleString('en-IN')} Advance</span>
            </span>
          )}
        </div>
      </div>

      {/* Carry-Forward Notification Banner (if previous month had a balance) */}
      {previousBalance !== 0 && (
        <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
          previousBalance > 0
            ? 'bg-amber-50/80 border-amber-200/80 text-amber-900'
            : 'bg-sky-50/80 border-sky-200/80 text-sky-900'
        }`}>
          <History className={`w-4 h-4 shrink-0 mt-0.5 ${previousBalance > 0 ? 'text-amber-600' : 'text-sky-600'}`} />
          <div className="space-y-1">
            <span className="font-bold block">
              {previousBalance > 0
                ? `Carried-Forward Unpaid Balance: +₹${previousBalance.toLocaleString('en-IN')}`
                : `Carried-Forward Surplus/Advance: -₹${Math.abs(previousBalance).toLocaleString('en-IN')}`}
            </span>
            <p className="text-[11px] opacity-90">
              {previousBalance > 0
                ? `The previous month had a remaining balance of ₹${previousBalance.toLocaleString('en-IN')}. It is added to this month's net salary (₹${netEstimatedSalary.toLocaleString('en-IN')}) for a total receivable of ₹${totalReceivable.toLocaleString('en-IN')}. When you enter received amount of ₹${totalReceivable.toLocaleString('en-IN')}, both will be balanced with ₹0 remaining.`
                : `The previous month had an extra advance of ₹${Math.abs(previousBalance).toLocaleString('en-IN')}, which is adjusted against this month's total receivable.`}
            </p>
          </div>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Expected Net Salary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            This Month Net Salary
          </span>
          <span className="text-xl font-black text-slate-800 block mt-1">
            ₹{netEstimatedSalary.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Base: ₹{baseSalary.toLocaleString('en-IN')}
            {summary?.leave_deduction > 0 && ` - ₹${summary.leave_deduction} cuts`}
          </span>
        </div>

        {/* Card 2: Previous Carried Balance */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          previousBalance > 0
            ? 'bg-amber-50/60 border-amber-200/80'
            : previousBalance < 0
            ? 'bg-sky-50/60 border-sky-200/80'
            : 'bg-slate-50 border-slate-200/80'
        }`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Previous Balance
          </span>
          <span className={`text-xl font-black block mt-1 ${
            previousBalance > 0 ? 'text-amber-700' : previousBalance < 0 ? 'text-sky-700' : 'text-slate-500'
          }`}>
            {previousBalance > 0 ? `+₹${previousBalance.toLocaleString('en-IN')}` : previousBalance < 0 ? `-₹${Math.abs(previousBalance).toLocaleString('en-IN')}` : '₹0'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {previousBalance > 0 ? 'Carried from past month' : previousBalance < 0 ? 'Surplus / Advance' : 'No previous dues'}
          </span>
        </div>

        {/* Card 3: Total Receivable */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
            Total Receivable
          </span>
          <span className="text-xl font-black text-indigo-700 block mt-1">
            ₹{totalReceivable.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-indigo-600/80 block mt-0.5">
            Net + Previous balance
          </span>
        </div>

        {/* Card 4: Received Salary */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Received Salary
          </span>
          <span className="text-xl font-black text-emerald-700 block mt-1">
            ₹{totalReceived.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5">
            {payments.length} payment(s) credited
          </span>
        </div>

        {/* Card 5: Balance Remaining */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          isBalanced
            ? 'bg-emerald-50/80 border-emerald-300'
            : balanceRemaining > 0
            ? 'bg-rose-50/70 border-rose-200'
            : 'bg-sky-50/70 border-sky-200'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${
            isBalanced ? 'text-emerald-700' : balanceRemaining > 0 ? 'text-rose-700' : 'text-sky-700'
          }`}>
            Balance Remaining
          </span>
          <span className={`text-xl font-black block mt-1 ${
            isBalanced ? 'text-emerald-700' : balanceRemaining > 0 ? 'text-rose-600' : 'text-sky-700'
          }`}>
            ₹{balanceRemaining.toLocaleString('en-IN')}
          </span>
          <span className={`text-[10px] block mt-0.5 ${
            isBalanced ? 'text-emerald-600' : balanceRemaining > 0 ? 'text-rose-500' : 'text-sky-600'
          }`}>
            {isBalanced ? 'No balance remaining!' : balanceRemaining > 0 ? 'Pending to receive' : 'Advance surplus'}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
        <div className="text-xs text-slate-600">
          {isBalanced ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>All clear for {monthDisplay}! The month salary and carry-forward balance are completely settled.</span>
            </span>
          ) : balanceRemaining > 0 ? (
            <span>
              Pending receivable for {monthDisplay}:{' '}
              <strong className="text-rose-600 font-extrabold">₹{balanceRemaining.toLocaleString('en-IN')}</strong>.
              Record received salary below to credit your balance.
            </span>
          ) : (
            <span className="text-sky-700 font-semibold">
              Advance balance of ₹{Math.abs(balanceRemaining).toLocaleString('en-IN')} will carry forward to next month.
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {balanceRemaining > 0 && (
            <button
              type="button"
              onClick={() => handleOpenAddModal(balanceRemaining)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              title={`Quick enter remaining due of ₹${balanceRemaining.toLocaleString('en-IN')}`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Settle Full Due (₹{balanceRemaining.toLocaleString('en-IN')})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Enter Received Salary</span>
          </button>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recorded Received Payments ({payments.length})
          </h3>
          <span className="text-[11px] text-slate-400">Credited to Live Balance automatically</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-1">
            <p className="text-xs font-bold text-slate-600">No received salary recorded yet for {monthDisplay}</p>
            <p className="text-[11px] text-slate-400">
              When your salary is credited, click &ldquo;+ Enter Received Salary&rdquo; to update your balance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {p.payment_date}
                    </td>
                    <td className="py-2.5 px-3 font-black text-emerald-700 whitespace-nowrap">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        p.payment_mode === 'Online'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.payment_mode === 'Online' ? '💳 Online (UPI/Bank)' : '💵 Cash'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {p.source_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                      {p.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Payment"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(p.id, Number(p.amount))}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Payment"
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

      {/* Record / Edit Salary Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600">
                  {type === 'school' ? 'School Salary' : 'Office Salary'}
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingPayment ? 'Edit Received Salary' : 'Enter Received Salary'}
                </h3>
                <span className="text-xs text-slate-400">{monthDisplay}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Received Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 45000"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {totalReceivable > 0 && (
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span>Total receivable this month: ₹{totalReceivable.toLocaleString('en-IN')}</span>
                    {amountInput !== String(totalReceivable) && (
                      <button
                        type="button"
                        onClick={() => setAmountInput(String(totalReceivable))}
                        className="text-emerald-600 font-bold hover:underline"
                      >
                        (Set ₹{totalReceivable.toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModeInput('Online')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      modeInput === 'Online'
                        ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Online (UPI/Bank)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeInput('Cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      modeInput === 'Cash'
                        ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Received Date *
                </label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Salary credited to bank account"
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPayment ? 'Update Payment' : 'Save & Credit Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
