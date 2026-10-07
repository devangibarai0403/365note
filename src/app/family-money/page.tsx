'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { FamilyMoneyTransaction, PaymentMode, UserBalance } from '@/types';
import {
  Users2,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Trash2,
  Loader2,
  HeartHandshake,
  Wallet,
  CreditCard,
  Banknote,
  Edit3,
  X,
  Check,
  Smartphone,
} from 'lucide-react';

export default function FamilyMoneyPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FamilyMoneyTransaction[]>([]);
  const [summary, setSummary] = useState<any>({
    totalReceived: 0,
    totalSent: 0,
    netFlow: 0,
    receivedFromPapa: 0,
    sentToPapa: 0,
    sentToOtherFamily: 0,
    cashReceived: 0,
    cashSent: 0,
    onlineReceived: 0,
    onlineSent: 0,
    memberBreakdown: {},
  });

  // Balance state
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [adminUserFilter, setAdminUserFilter] = useState(''); // '' = all, 'devangi', 'shrikesh'
  const [searchQuery, setSearchQuery] = useState('');

  // Transaction Entry Form state
  const [transactionType, setTransactionType] = useState<'received' | 'sent'>('received');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Online');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [otherPersonName, setOtherPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [forUser, setForUser] = useState(role === 'shrikesh' ? 'shrikesh' : 'devangi');
  const [submitting, setSubmitting] = useState(false);

  // Set default person on user switch
  useEffect(() => {
    if (role === 'devangi') {
      setSelectedPerson('Papa');
    } else if (role === 'shrikesh') {
      setSelectedPerson('Amma');
    } else {
      setSelectedPerson('Papa');
    }
  }, [role]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/family-money?month=${selectedMonth}`;
      if (adminUserFilter) url += `&user_id=${adminUserFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, adminUserFilter]);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const target = role === 'admin' ? (adminUserFilter || forUser) : user?.username;
      const res = await fetch(`/api/balance?user_id=${target || 'devangi'}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBalanceLoading(false);
    }
  }, [role, adminUserFilter, forUser, user?.username]);

  useEffect(() => {
    fetchTransactions();
    fetchBalance();
  }, [fetchTransactions, fetchBalance]);

  // Family dropdown options strictly adhering to Req 5 and Req 6
  const getFamilyOptions = () => {
    const effectiveRole = role === 'admin' ? forUser : role;
    if (effectiveRole === 'devangi') {
      return ['Papa', 'Chetna', 'Dhaval', 'Mummy', 'Others'];
    }
    if (effectiveRole === 'shrikesh') {
      return ['Amma', 'Shrivas', 'Shriraj', 'Others'];
    }
    return ['Papa', 'Amma', 'Chetna', 'Dhaval', 'Mummy', 'Shrivas', 'Shriraj', 'Others'];
  };

  // Handle Add Transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPerson = selectedPerson === 'Others' ? otherPersonName.trim() : selectedPerson;

    if (!finalPerson) {
      toast('Please specify family member', 'error');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast('Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/family-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_date: transactionDate,
          transaction_type: transactionType,
          person_name: finalPerson,
          amount: Number(amount),
          payment_mode: paymentMode,
          reason: reason || null,
          for_user: role === 'admin' ? forUser : undefined,
        }),
      });

      if (res.ok) {
        toast(`Transaction with ${finalPerson} (${paymentMode}) saved!`, 'success');
        setAmount('');
        setReason('');
        setOtherPersonName('');
        setPaymentMode('Online');
        fetchTransactions();
        fetchBalance();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save transaction', 'error');
      }
    } catch {
      toast('Failed to save transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    try {
      const res = await fetch(`/api/family-money?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Transaction deleted', 'info');
        fetchTransactions();
        fetchBalance();
      }
    } catch {
      toast('Failed to delete transaction', 'error');
    }
  };

  // Month options
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  // Filtered list - Exclude LIC auto-deduction transactions so Family Money only shows family members
  const filteredList = transactions
    .filter(t => t.person_name.toUpperCase() !== 'LIC')
    .filter(t => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.person_name.toLowerCase().includes(q) ||
        (t.reason && t.reason.toLowerCase().includes(q)) ||
        (t.payment_mode && t.payment_mode.toLowerCase().includes(q)) ||
        t.transaction_date.includes(q)
      );
    });

  const activeTargetName = role === 'admin' 
    ? (adminUserFilter ? (adminUserFilter === 'devangi' ? 'Devangi' : 'Shrikesh') : (forUser === 'devangi' ? 'Devangi' : 'Shrikesh'))
    : (role === 'devangi' ? 'Devangi' : 'Shrikesh');

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-100">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Family Money</h1>
            <p className="text-xs text-slate-500">
              {role === 'devangi'
                ? 'Track amount sent by family member and money sent to family members'
                : role === 'shrikesh'
                ? 'Track money received from family and sent to family members'
                : 'Comprehensive overview of family money flows and available balances'}
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
              All
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

      {/* SECTION 2: Monthly Flow KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Received */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase block">
              {role === 'devangi' ? 'Amount Sent by Family Member' : 'Total Amount Received'}
            </span>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">
              ₹{Number(summary.totalReceived || 0).toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-emerald-600/80 mt-1">
              <span>💵 Cash: ₹{Number(summary.cashReceived || 0).toLocaleString('en-IN')}</span>
              <span>•</span>
              <span>📱 Online: ₹{Number(summary.onlineReceived || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Total Sent */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm bg-gradient-to-br from-white to-rose-50/40 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-700 uppercase block">
              Total Amount Sent to Family
            </span>
            <h3 className="text-2xl font-black text-rose-700 mt-1">
              ₹{Number(summary.totalSent || 0).toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-rose-600/80 mt-1">
              <span>💵 Cash: ₹{Number(summary.cashSent || 0).toLocaleString('en-IN')}</span>
              <span>•</span>
              <span>📱 Online: ₹{Number(summary.onlineSent || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Net Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase block">
              Monthly Net Flow ({selectedMonth})
            </span>
            <h3
              className={`text-2xl font-black mt-1 ${
                Number(summary.netFlow || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {Number(summary.netFlow || 0) >= 0 ? '+' : ''}₹
              {Number(summary.netFlow || 0).toLocaleString('en-IN')}
            </h3>
            <span className="text-[11px] text-slate-400">Received − Sent this month</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            ₹
          </div>
        </div>
      </div>

      {/* SECTION 3: Main Form & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Rapid Family Money Entry Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-base text-slate-800">Record Transaction</h2>
              <p className="text-xs text-slate-400">Log money received or sent</p>
            </div>
            <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">
              Family
            </span>
          </div>

          <form onSubmit={handleAddTransaction} className="space-y-4">
            {role === 'admin' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Assign To Profile *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForUser('devangi');
                      setSelectedPerson('Papa');
                    }}
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
                    onClick={() => {
                      setForUser('shrikesh');
                      setSelectedPerson('Amma');
                    }}
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

            {/* Type selector: Received vs Sent */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTransactionType('received')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  transactionType === 'received'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                📥 Received
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('sent')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  transactionType === 'sent'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                📤 Sent
              </button>
            </div>

            {/* Payment Mode Selector: Cash vs Online */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Payment Mode *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('Online')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    paymentMode === 'Online'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Online Transfer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    paymentMode === 'Cash'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>
              </div>
            </div>

            {/* Family Member */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Family Member *
              </label>
              <select
                value={selectedPerson}
                onChange={e => setSelectedPerson(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {getFamilyOptions().map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {selectedPerson === 'Others' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Name of Person *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Uncle, Mama, Relative"
                  value={otherPersonName}
                  onChange={e => setOtherPersonName(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Reason / Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Medical expense, Savings, Gift, Monthly"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Date
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={e => setTransactionDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm shadow-md shadow-pink-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Save Transaction</span>
            </button>
          </form>

          {/* Member-wise summary list */}
          {summary.memberBreakdown && Object.keys(summary.memberBreakdown).length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-400 block">
                Member-wise Breakdown ({selectedMonth})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {Object.entries(summary.memberBreakdown).map(([member, flow]: [string, any]) => (
                  <div
                    key={member}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-800">{member}</span>
                    <div className="text-right space-x-2">
                      {flow.received > 0 && (
                        <span className="text-emerald-700 font-bold">
                          +₹{Number(flow.received).toLocaleString('en-IN')}
                        </span>
                      )}
                      {flow.sent > 0 && (
                        <span className="text-rose-600 font-bold">
                          -₹{Number(flow.sent).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: History Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-bold text-base text-slate-800">Transaction History</h2>
              <p className="text-xs text-slate-400">
                Detailed record of all money sent and received
              </p>
            </div>

            <div className="flex items-center gap-2">
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
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by person, reason, date, or mode (Cash/Online)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
              <p className="text-xs text-slate-400">Loading transactions...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">No family transactions found</p>
              <p className="text-xs text-slate-400">
                Use the form on the left to record incoming or outgoing family money.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    {role === 'admin' && <th className="py-2.5 px-3">User</th>}
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Person</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {item.transaction_date}
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
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.transaction_type === 'received'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.transaction_type === 'received' ? '📥 Received' : '📤 Sent'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-max ${
                            item.payment_mode === 'Cash'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {item.payment_mode === 'Cash' ? (
                            <>
                              <Banknote className="w-3 h-3" /> Cash
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-3 h-3" /> Online
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{item.person_name}</td>
                      <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                        {item.reason || '—'}
                      </td>
                      <td
                        className={`py-3 px-3 font-black ${
                          item.transaction_type === 'received'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {item.transaction_type === 'received' ? '+' : '-'}₹
                        {Number(item.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Transaction"
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
