'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Wallet,
  Banknote,
  CreditCard,
  Edit3,
  Users2,
  Receipt,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  X,
  Check,
  Smartphone,
  ExternalLink,
  Coins,
  DollarSign,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';

interface UserBalance {
  user_id: string;
  initial_cash: number;
  initial_online: number;
  cash_received: number;
  cash_sent: number;
  online_received: number;
  online_sent: number;
  classes_cash?: number;
  classes_online?: number;
  kharcha_cash: number;
  kharcha_online: number;
  available_cash: number;
  available_online: number;
  total_available: number;
  updated_at: string;
}

export default function AvailableMoneyPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Filter for admin
  const [targetUser, setTargetUser] = useState<'devangi' | 'shrikesh'>(
    role === 'shrikesh' ? 'shrikesh' : 'devangi'
  );

  // Edit Balance Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCash, setEditCash] = useState('');
  const [editOnline, setEditOnline] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  // Activity logs
  const [recentKharcha, setRecentKharcha] = useState<any[]>([]);
  const [recentFamily, setRecentFamily] = useState<any[]>([]);
  const [recentLic, setRecentLic] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const effectiveUser = role === 'admin' ? targetUser : (role === 'shrikesh' ? 'shrikesh' : 'devangi');

  const fetchBalance = useCallback(async () => {
    try {
      setBalanceLoading(true);
      const res = await fetch(`/api/balance?user_id=${effectiveUser}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBalanceLoading(false);
    }
  }, [effectiveUser]);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 1. Fetch Daily Kharcha
      const kharchaPromise = fetch(`/api/kharcha?month=${currentMonth}&user_id=${effectiveUser}`)
        .then(r => r.ok ? r.json() : { expenses: [] })
        .then(d => setRecentKharcha((d.expenses || []).slice(0, 5)))
        .catch(() => setRecentKharcha([]));

      // 2. Fetch Family Money
      const familyPromise = fetch(`/api/family-money?month=${currentMonth}&user_id=${effectiveUser}`)
        .then(r => r.ok ? r.json() : { transactions: [] })
        .then(d => {
          const allTx: any[] = d.transactions || [];
          // Filter LIC and non-LIC family
          const licTx = allTx.filter(t => t.person_name?.toUpperCase() === 'LIC' || (t.reason && t.reason.toUpperCase().includes('LIC')));
          const famTx = allTx.filter(t => t.person_name?.toUpperCase() !== 'LIC');
          setRecentFamily(famTx.slice(0, 5));
          setRecentLic(licTx.slice(0, 5));
        })
        .catch(() => {
          setRecentFamily([]);
          setRecentLic([]);
        });

      await Promise.all([kharchaPromise, familyPromise]);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  }, [effectiveUser]);

  useEffect(() => {
    fetchBalance();
    fetchLogs();
  }, [fetchBalance, fetchLogs]);

  const handleOpenEdit = () => {
    if (balance) {
      setEditCash(String(balance.available_cash));
      setEditOnline(String(balance.available_online));
    } else {
      setEditCash('0');
      setEditOnline('0');
    }
    setIsModalOpen(true);
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(Number(editCash)) || isNaN(Number(editOnline))) {
      toast('Please enter valid numeric amounts', 'error');
      return;
    }

    setSavingBalance(true);
    try {
      const res = await fetch('/api/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash: Number(editCash),
          online: Number(editOnline),
          for_user: effectiveUser,
        }),
      });

      if (res.ok) {
        toast('Current available money updated!', 'success');
        setIsModalOpen(false);
        fetchBalance();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to update balance', 'error');
      }
    } catch {
      toast('Failed to update balance', 'error');
    } finally {
      setSavingBalance(false);
    }
  };

  const cashShare = Math.round(
    ((Number(balance?.available_cash || 0)) / Math.max(1, Number(balance?.total_available || 1))) * 100
  );
  const onlineShare = Math.round(
    ((Number(balance?.available_online || 0)) / Math.max(1, Number(balance?.total_available || 1))) * 100
  );

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-800 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Available Money</h1>
            <p className="text-xs text-slate-500">
              Live balances and unified money breakdown across Family, Kharcha &amp; LIC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin User Filter */}
          {role === 'admin' && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs">
              <span className="font-bold text-slate-500 pl-2">User:</span>
              <button
                onClick={() => setTargetUser('devangi')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  targetUser === 'devangi'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Devangi
              </button>
              <button
                onClick={() => setTargetUser('shrikesh')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  targetUser === 'shrikesh'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Shrikesh
              </button>
            </div>
          )}

          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Set / Update Balance</span>
          </button>
        </div>
      </div>

      {/* Main Balance Hero Cards */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50">
        <div className="flex items-center justify-between pb-4 border-b border-indigo-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
              <Wallet className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white">Live Available Money</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                  {effectiveUser}
                </span>
              </div>
              <p className="text-xs text-indigo-200/70">
                Directly debited on daily expenses &amp; LIC deductions, credited on incoming family money &amp; class fees
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-indigo-200/70 hidden sm:block">
            Last Updated: <span className="font-bold text-white">{balance ? new Date(balance.updated_at).toLocaleDateString('en-IN') : '—'}</span>
          </div>
        </div>

        {/* 3 Large Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Available Cash Card */}
          <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-amber-300 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <Banknote className="w-4 h-4 text-amber-400" />
                <span>Available Cash</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-semibold border border-amber-400/20">
                Cash In Hand
              </span>
            </div>
            <div className="text-3xl font-black text-white mt-2">
              {balanceLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              ) : (
                `₹${Number(balance?.available_cash || 0).toLocaleString('en-IN')}`
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-amber-200/80 mt-3 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1 text-emerald-400">
                +₹{Number(balance?.cash_received || 0).toLocaleString('en-IN')} in
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-rose-400">
                -₹{Number(balance?.cash_sent || 0).toLocaleString('en-IN')} sent
              </span>
              {Number(balance?.kharcha_cash || 0) > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-300">
                    -₹{Number(balance?.kharcha_cash || 0).toLocaleString('en-IN')} spent
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Available Online Card */}
          <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-sky-500/20 hover:border-sky-500/40 transition-all">
            <div className="flex items-center justify-between text-sky-300 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-sky-400" />
                <span>Available Online</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300 font-semibold border border-sky-400/20">
                Bank / UPI
              </span>
            </div>
            <div className="text-3xl font-black text-white mt-2">
              {balanceLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              ) : (
                `₹${Number(balance?.available_online || 0).toLocaleString('en-IN')}`
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-sky-200/80 mt-3 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1 text-emerald-400">
                +₹{Number(balance?.online_received || 0).toLocaleString('en-IN')} in
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-rose-400">
                -₹{Number(balance?.online_sent || 0).toLocaleString('en-IN')} sent
              </span>
              {Number(balance?.kharcha_online || 0) > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-sky-300">
                    -₹{Number(balance?.kharcha_online || 0).toLocaleString('en-IN')} spent
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Total Combined Balance Card */}
          <div className="bg-indigo-600/20 backdrop-blur-sm p-5 rounded-2xl border border-indigo-400/30 hover:border-indigo-400/50 transition-all">
            <div className="flex items-center justify-between text-indigo-300 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <Coins className="w-4 h-4 text-indigo-300" />
                <span>Total Available</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 font-semibold border border-indigo-400/30">
                Cash + Online
              </span>
            </div>
            <div className="text-3xl font-black text-emerald-400 mt-2">
              {balanceLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-300" />
              ) : (
                `₹${Number(balance?.total_available || 0).toLocaleString('en-IN')}`
              )}
            </div>
            <div className="text-[11px] text-indigo-200/70 mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span>Combined Funds</span>
              <span className="text-white/80 font-bold">
                Cash: {cashShare}% | Online: {onlineShare}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Flow Channels Grid: Family Money, Daily Kharcha, LIC Deduction */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-800">Funds Flow Breakdown</h2>
            <p className="text-xs text-slate-500">Live channels impacting this available balance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Family Money Channel */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                    <Users2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Family Money</h3>
                    <p className="text-[11px] text-slate-400">Incoming &amp; Outgoing family transfers</p>
                  </div>
                </div>
                <Link
                  href="/family-money"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                  title="Open Family Money"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Received (In)</span>
                  <span className="text-base font-black text-emerald-700">
                    +₹{(Number(balance?.cash_received || 0) + Number(balance?.online_received || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase text-rose-700 block">Sent to Family</span>
                  <span className="text-base font-black text-rose-700">
                    -₹{(Number(balance?.cash_sent || 0) + Number(balance?.online_sent || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Recent Logs List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 block">Recent Family Transactions</span>
                {logsLoading ? (
                  <div className="py-6 flex justify-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : recentFamily.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No family records this month</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentFamily.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{item.person_name}</p>
                          <span className="text-[10px] text-slate-400">{item.transaction_date} • {item.payment_mode}</span>
                        </div>
                        <span className={`font-black ${item.transaction_type === 'received' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {item.transaction_type === 'received' ? '+' : '-'}₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                href="/family-money"
                className="w-full py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View Family Money</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Daily Kharcha Channel */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Daily Kharcha</h3>
                    <p className="text-[11px] text-slate-400">Routine micro &amp; daily expenses</p>
                  </div>
                </div>
                <Link
                  href="/kharcha"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Open Daily Kharcha"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase text-amber-700 block">Cash Spent</span>
                  <span className="text-base font-black text-amber-700">
                    -₹{Number(balance?.kharcha_cash || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-2.5">
                  <span className="text-[10px] font-bold uppercase text-sky-700 block">Online Spent</span>
                  <span className="text-base font-black text-sky-700">
                    -₹{Number(balance?.kharcha_online || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Recent Logs List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 block">Recent Kharcha Logs</span>
                {logsLoading ? (
                  <div className="py-6 flex justify-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : recentKharcha.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No kharcha logged this month</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentKharcha.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{item.spent_on}</p>
                          <span className="text-[10px] text-slate-400">{item.expense_date} • {item.payment_mode}</span>
                        </div>
                        <span className="font-black text-slate-800">
                          -₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                href="/kharcha"
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View Daily Kharcha</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: LIC Deduction Channel */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">LIC Auto Deduction</h3>
                    <p className="text-[11px] text-slate-400">Automatic monthly insurance premiums</p>
                  </div>
                </div>
                <Link
                  href="/lic"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  title="Open LIC Deduction"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              {/* Stats row */}
              <div className="bg-violet-50/70 border border-violet-100 rounded-xl p-3 mb-4">
                <span className="text-[10px] font-bold uppercase text-violet-700 block">Deduction Channel</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-violet-900">Online Balance Only</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-200 text-violet-800">
                    Auto Cron Active
                  </span>
                </div>
              </div>

              {/* Recent Logs List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 block">Recent LIC Deductions</span>
                {logsLoading ? (
                  <div className="py-6 flex justify-center text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : recentLic.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No LIC deductions processed yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentLic.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-violet-50/40 border border-violet-100 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{item.reason || item.person_name}</p>
                          <span className="text-[10px] text-slate-400">{item.transaction_date} • Online</span>
                        </div>
                        <span className="font-black text-violet-700">
                          -₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <Link
                href="/lic"
                className="w-full py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Manage LIC Settings</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Set / Update Available Money */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Set Available Money</h3>
                  <p className="text-xs text-slate-400">Initialize or adjust live balance for {effectiveUser}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  💵 Current Available Cash (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000"
                    value={editCash}
                    onChange={e => setEditCash(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Amount in cash currently in hand
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  📱 Current Available Online (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 25000"
                    value={editOnline}
                    onChange={e => setEditOnline(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Bank / UPI balance currently available
                </span>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 leading-relaxed">
                💡 <span className="font-semibold">Note:</span> Changing this baseline updates your live balances. All subsequent transactions (daily kharcha, family money, and LIC) will adjust from this amount in real time.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {savingBalance ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Balance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
