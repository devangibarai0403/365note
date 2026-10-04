'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DailyKharcha, UserBalance } from '@/types';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  TrendingDown,
  Loader2,
  Users,
} from 'lucide-react';

export default function DailyKharchaPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<DailyKharcha[]>([]);
  const [summary, setSummary] = useState({
    totalExpense: 0,
    cashExpense: 0,
    onlineExpense: 0,
    count: 0,
  });

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [adminUserFilter, setAdminUserFilter] = useState(''); // '' = all, 'devangi', 'shrikesh'
  const [paymentModeFilter, setPaymentModeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Rapid Expense Entry Form state
  const [amount, setAmount] = useState('');
  const [spentOn, setSpentOn] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online'>('Cash');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [forUser, setForUser] = useState(role === 'shrikesh' ? 'shrikesh' : 'devangi');
  const [submitting, setSubmitting] = useState(false);

  // Balance state
  const [balance, setBalance] = useState<UserBalance | null>(null);

  // Fetch expenses with active filters
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/kharcha?month=${selectedMonth}`;
      if (adminUserFilter) url += `&user_id=${adminUserFilter}`;
      if (paymentModeFilter) url += `&payment_mode=${paymentModeFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setSummary(
          data.summary || { totalExpense: 0, cashExpense: 0, onlineExpense: 0, count: 0 }
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, adminUserFilter, paymentModeFilter]);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    try {
      const target = role === 'admin' ? (adminUserFilter || forUser) : user?.username;
      const res = await fetch(`/api/balance?user_id=${target || 'devangi'}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (e) {
      console.error(e);
    }
  }, [role, adminUserFilter, forUser, user?.username]);

  useEffect(() => {
    fetchExpenses();
    fetchBalance();
  }, [fetchExpenses, fetchBalance]);

  // Handle Quick Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !spentOn) {
      toast('Please enter amount and what it was spent on', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/kharcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          spent_on: spentOn,
          payment_mode: paymentMode,
          expense_date: expenseDate,
          for_user: role === 'admin' ? forUser : undefined,
        }),
      });

      if (res.ok) {
        toast(`₹${amount} recorded for "${spentOn}"!`, 'success');
        setAmount('');
        setSpentOn('');
        fetchExpenses();
        fetchBalance();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save expense', 'error');
      }
    } catch {
      toast('Failed to save expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/kharcha?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Expense entry deleted', 'info');
        fetchExpenses();
        fetchBalance();
      }
    } catch {
      toast('Failed to delete expense', 'error');
    }
  };

  // Compute Today's Expense
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpense = expenses
    .filter(e => e.expense_date === todayStr)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  // Month selector options
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  // Filtered expenses by search query
  const filteredExpenses = expenses.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.spent_on.toLowerCase().includes(q) ||
      e.expense_date.includes(q) ||
      e.payment_mode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daily Kharcha</h1>
            <p className="text-xs text-slate-500">
              Record every expense without minimum limits — even ₹10 tea/auto
            </p>
          </div>
        </div>

        {/* User filter for Admin */}
        {role === 'admin' && (
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs">
            <span className="font-bold text-slate-500 pl-2">Filter User:</span>
            <button
              onClick={() => setAdminUserFilter('')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                adminUserFilter === ''
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setAdminUserFilter('devangi')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                adminUserFilter === 'devangi'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Devangi
            </button>
            <button
              onClick={() => setAdminUserFilter('shrikesh')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                adminUserFilter === 'shrikesh'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shrikesh
            </button>
          </div>
        )}
      </div>

      {/* Live Available Balance Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-indigo-900/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
            <Wallet className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">Live Available Balance</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                {role === 'admin' ? (adminUserFilter || forUser) : (user?.display_name || user?.username)}
              </span>
            </div>
            <span className="text-xs text-indigo-200/70 block">
              Directly deducted on every cash/online expense
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-xs font-bold sm:flex sm:items-center sm:gap-3">
          <div className="p-2.5 sm:px-4 sm:py-2 rounded-2xl bg-white/5 border border-amber-500/30 text-left">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Available Cash</span>
            <span className="text-white font-black text-base sm:text-lg">
              ₹{Number(balance?.available_cash || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2.5 sm:px-4 sm:py-2 rounded-2xl bg-white/5 border border-sky-500/30 text-left">
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider block">Available Online</span>
            <span className="text-white font-black text-base sm:text-lg">
              ₹{Number(balance?.available_online || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2.5 sm:px-4 sm:py-2 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-left">
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Total Available</span>
            <span className="text-emerald-400 font-black text-base sm:text-lg">
              ₹{Number(balance?.total_available || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Today, This Month, Cash, Online */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase block">
              Today's Expense
            </span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              ₹{Math.round(todayExpense).toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-slate-400">Recorded today</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            ₹
          </div>
        </div>

        {/* This Month's Total */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/30 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase block">
              This Month's Total
            </span>
            <h3 className="text-2xl font-black text-indigo-700 mt-1">
              ₹{Math.round(summary.totalExpense).toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-indigo-500/80">{summary.count} entries</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Cash Expense */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase block">
              Cash Expenses
            </span>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">
              ₹{Math.round(summary.cashExpense).toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-emerald-600/80">Paid in cash</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        {/* Online Expense */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm bg-gradient-to-br from-white to-sky-50/30 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-sky-600 uppercase block">
              Online Expenses
            </span>
            <h3 className="text-2xl font-black text-sky-700 mt-1">
              ₹{Math.round(summary.onlineExpense).toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-sky-600/80">UPI / Cards / Net Banking</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Form & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Rapid 5-Second Expense Entry */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-base text-slate-800">New Expense Entry</h2>
              <p className="text-xs text-slate-400">Save in under 5 seconds</p>
            </div>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
              Kharcha
            </span>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-4">
            {role === 'admin' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Assign To User *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForUser('devangi')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      forUser === 'devangi'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Devangi
                  </button>
                  <button
                    type="button"
                    onClick={() => setForUser('shrikesh')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      forUser === 'shrikesh'
                        ? 'bg-sky-50 border-sky-500 text-sky-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Shrikesh
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Amount Spent (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 10 or 250"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Any amount, even ₹10 for chai/auto.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Amount Spent On *
              </label>
              <input
                type="text"
                placeholder="e.g. Tea, Travel, Stationary, Grocery, Snacks"
                value={spentOn}
                onChange={e => setSpentOn(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      paymentMode === 'Cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Online')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      paymentMode === 'Online'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    📱 Online
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Record Expense</span>
            </button>
          </form>
        </div>

        {/* Right Column: Expenses History Table & Filter */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bold text-base text-slate-800">Expense History</h2>
              <p className="text-xs text-slate-400">
                All daily kharcha records with payment mode breakdown
              </p>
            </div>

            {/* Filter controls */}
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
                value={paymentModeFilter}
                onChange={e => setPaymentModeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="">All Modes</option>
                <option value="Cash">Cash Only</option>
                <option value="Online">Online Only</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses by item, date, mode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs text-slate-400">Loading daily expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Wallet className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">No expenses recorded for this month</p>
              <p className="text-xs text-slate-400">
                Use the form on the left to quickly log your daily expenses.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    {role === 'admin' && <th className="py-2.5 px-3">User</th>}
                    <th className="py-2.5 px-3">Spent On</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {item.expense_date}
                      </td>
                      {role === 'admin' && (
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              item.user_id === 'devangi'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {item.user_id}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-3 font-bold text-slate-900">{item.spent_on}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.payment_mode === 'Cash'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {item.payment_mode === 'Cash' ? '💵 Cash' : '📱 Online'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-black text-slate-800">
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Expense"
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
    </div>
  );
}
