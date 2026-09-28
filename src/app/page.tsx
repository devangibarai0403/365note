'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  School as SchoolIcon,
  Building2,
  Wallet,
  Users2,
  Calendar,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Plus,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { QuickAddModal } from '@/components/QuickAddModal';

export default function DashboardPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [quickAddTab, setQuickAddTab] = useState<'kharcha' | 'classes' | 'family'>('kharcha');
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/stats?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const openQuickAdd = (tab: 'kharcha' | 'classes' | 'family') => {
    setQuickAddTab(tab);
    setQuickAddOpen(true);
  };

  if (loading && !stats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-500">Loading your dashboard...</p>
      </div>
    );
  }

  // Generate month options for filter (past 12 months)
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-600">
            Welcome back
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Hello, {user?.display_name || 'User'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {role === 'admin'
              ? 'Comprehensive tracking and administrative control overview'
              : role === 'devangi'
              ? "Here is your classes, school attendance, and financial overview"
              : "Here is your office attendance, daily expenses, and family money overview"}
          </p>
        </div>

        {/* Month Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              {monthOptions.map(m => (
                <option key={m.val} value={m.val}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => openQuickAdd('kharcha')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Kharcha</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DEVANGI DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'devangi' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Pehla Requirement: Classes KPI Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-extrabold text-slate-800">Classes Overview</h2>
              </div>
              <Link
                href="/classes"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View All Classes</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* Today's Classes */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Today's Classes
                </span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  {stats?.classes?.todayClasses || 0}
                </h3>
                <span className="text-[10px] text-slate-400">Sessions</span>
              </div>

              {/* Today's Hours */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Today's Hours
                </span>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">
                  {stats?.classes?.todayHours || 0} hrs
                </h3>
                <span className="text-[10px] text-slate-400">Taught today</span>
              </div>

              {/* Today's Earnings */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase">
                  Today's Earnings
                </span>
                <h3 className="text-2xl font-black text-emerald-700 mt-1">
                  ₹{Number(stats?.classes?.todayEarnings || 0).toLocaleString('en-IN')}
                </h3>
                <span className="text-[10px] text-emerald-600/80">Earned today</span>
              </div>

              {/* Monthly Classes */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Monthly Classes
                </span>
                <h3 className="text-2xl font-black text-slate-800 mt-1">
                  {stats?.classes?.monthClasses || 0}
                </h3>
                <span className="text-[10px] text-slate-400">This month</span>
              </div>

              {/* Monthly Hours */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Monthly Hours
                </span>
                <h3 className="text-2xl font-black text-violet-600 mt-1">
                  {stats?.classes?.monthHours || 0} hrs
                </h3>
                <span className="text-[10px] text-slate-400">Total duration</span>
              </div>

              {/* Monthly Earnings */}
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
                <span className="text-[11px] font-semibold text-indigo-600 uppercase">
                  Monthly Earnings
                </span>
                <h3 className="text-2xl font-black text-indigo-700 mt-1">
                  ₹{Number(stats?.classes?.monthEarnings || 0).toLocaleString('en-IN')}
                </h3>
                <span className="text-[10px] text-indigo-600/80">Selected month</span>
              </div>
            </div>
          </div>

          {/* Dusra Requirement: School Attendance Summary */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-extrabold text-slate-800">School Attendance</h2>
              </div>
              <Link
                href="/school"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Open Calendar View</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Working Days</span>
                  <h4 className="text-3xl font-black text-emerald-700 mt-1">
                    {stats?.school?.workingDays || 0} Days
                  </h4>
                </div>
                <span className="text-2xl">🟢</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Leave by School</span>
                  <h4 className="text-3xl font-black text-amber-600 mt-1">
                    {stats?.school?.leaveBySchool || 0} Days
                  </h4>
                </div>
                <span className="text-2xl">🟡</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Leave Taken by You</span>
                  <h4 className="text-3xl font-black text-rose-600 mt-1">
                    {stats?.school?.leaveTaken || 0} Days
                  </h4>
                </div>
                <span className="text-2xl">🔴</span>
              </div>
            </div>
          </div>

          {/* Daily Kharcha & Family Money Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Kharcha Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-base text-slate-800">Daily Kharcha</h3>
                </div>
                <Link
                  href="/kharcha"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50">
                  <span className="text-xs text-slate-400 block font-medium">Today's Expense</span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">
                    ₹{Number(stats?.kharcha?.todayExpense || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50/60">
                  <span className="text-xs text-indigo-600 block font-medium">This Month's Expense</span>
                  <span className="text-2xl font-black text-indigo-700 mt-1 block">
                    ₹{Number(stats?.kharcha?.monthExpense || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Cash: ₹{Number(stats?.kharcha?.cashExpense || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Online: ₹{Number(stats?.kharcha?.onlineExpense || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Family Money Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-pink-600" />
                  <h3 className="font-bold text-base text-slate-800">Family Money</h3>
                </div>
                <Link
                  href="/family-money"
                  className="text-xs font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-xs text-emerald-700 block font-medium">
                    Received from Papa
                  </span>
                  <span className="text-2xl font-black text-emerald-800 mt-1 block">
                    ₹{Number(stats?.familyMoney?.papaReceived || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <span className="text-xs text-rose-700 block font-medium">
                    Sent to Family
                  </span>
                  <span className="text-2xl font-black text-rose-800 mt-1 block">
                    ₹{Number(stats?.familyMoney?.sent || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Sent to Papa: ₹{Number(stats?.familyMoney?.papaSent || 0).toLocaleString('en-IN')}</span>
                <span>Net Flow: ₹{Number((stats?.familyMoney?.received || 0) - (stats?.familyMoney?.sent || 0)).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SHRIKESH DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'shrikesh' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Teesra Requirement: Office Attendance Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-extrabold text-slate-800">Office Attendance</h2>
              </div>
              <Link
                href="/office"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Open Calendar View</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Working Days</span>
                  <h4 className="text-3xl font-black text-emerald-700 mt-1">
                    {stats?.office?.workingDays || 0} Days
                  </h4>
                </div>
                <span className="text-2xl">🟢</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Leave by Office</span>
                  <h4 className="text-3xl font-black text-amber-600 mt-1">
                    {stats?.office?.leaveByOffice || 0} Days
                  </h4>
                </div>
                <span className="text-2xl">🟡</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Leave Taken by You</span>
                  <h4 className="text-3xl font-black text-rose-600 mt-1">
                    {stats?.office?.leaveTaken || 0} Days
                  </h4>
                </div>
                <span className="text-2xl">🔴</span>
              </div>
            </div>
          </div>

          {/* Daily Kharcha & Family Money Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Kharcha Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-base text-slate-800">Daily Kharcha</h3>
                </div>
                <Link
                  href="/kharcha"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50">
                  <span className="text-xs text-slate-400 block font-medium">Today's Expense</span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">
                    ₹{Number(stats?.kharcha?.todayExpense || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50/60">
                  <span className="text-xs text-indigo-600 block font-medium">This Month's Expense</span>
                  <span className="text-2xl font-black text-indigo-700 mt-1 block">
                    ₹{Number(stats?.kharcha?.monthExpense || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Cash: ₹{Number(stats?.kharcha?.cashExpense || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Online: ₹{Number(stats?.kharcha?.onlineExpense || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Family Money Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-base text-slate-800">Family Money</h3>
                </div>
                <Link
                  href="/family-money"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <span className="text-xs text-emerald-700 block font-medium">
                    Received from Family
                  </span>
                  <span className="text-2xl font-black text-emerald-800 mt-1 block">
                    ₹{Number(stats?.familyMoney?.received || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <span className="text-xs text-rose-700 block font-medium">
                    Sent to Family
                  </span>
                  <span className="text-2xl font-black text-rose-800 mt-1 block">
                    ₹{Number(stats?.familyMoney?.sent || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>Total Transactions</span>
                <span>Net Flow: ₹{Number((stats?.familyMoney?.received || 0) - (stats?.familyMoney?.sent || 0)).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ADMIN DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {role === 'admin' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Quick Action Tiles for Admin */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/excel-import"
              className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md flex items-center gap-3 hover:scale-[1.02] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Upload Excel</h4>
                <p className="text-[11px] text-white/80">Import old classes</p>
              </div>
            </Link>

            <Link
              href="/classes"
              className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md flex items-center gap-3 hover:scale-[1.02] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Manage Classes</h4>
                <p className="text-[11px] text-white/80">Set hourly rates</p>
              </div>
            </Link>

            <Link
              href="/school"
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md flex items-center gap-3 hover:scale-[1.02] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <SchoolIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Manage Schools</h4>
                <p className="text-[11px] text-white/80">Salaries & Blob docs</p>
              </div>
            </Link>

            <Link
              href="/calendar"
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md flex items-center gap-3 hover:scale-[1.02] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Admin Calendar</h4>
                <p className="text-[11px] text-white/80">Notes & reminders</p>
              </div>
            </Link>
          </div>

          {/* Devangi Section for Admin */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-rose-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  D
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Devangi Overview</h3>
                  <p className="text-xs text-slate-500">Classes, Schools, Kharcha & Family Money</p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                Devangi
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Classes Earnings */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold block uppercase">
                  Classes Earnings ({selectedMonth})
                </span>
                <span className="text-2xl font-black text-indigo-700 mt-1 block">
                  ₹{Number(stats?.classes?.monthEarnings || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {stats?.classes?.monthClasses || 0} classes • {stats?.classes?.monthHours || 0} hrs
                </span>
              </div>

              {/* School Attendance */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold block uppercase">
                  School Attendance
                </span>
                <span className="text-xl font-black text-slate-800 mt-1 block">
                  🟢 {stats?.school?.workingDays || 0} / 🟡 {stats?.school?.leaveBySchool || 0} / 🔴{' '}
                  {stats?.school?.leaveTaken || 0}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {stats?.school?.totalSchools || 0} registered schools
                </span>
              </div>

              {/* Daily Kharcha */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold block uppercase">
                  Monthly Expenses
                </span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">
                  ₹{Number(stats?.kharcha?.devangi?.monthExpense || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Cash: ₹{Number(stats?.kharcha?.devangi?.cashExpense || 0).toLocaleString('en-IN')} •
                  Online: ₹
                  {Number(stats?.kharcha?.devangi?.onlineExpense || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Family Money */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold block uppercase">
                  Family Flow (Papa)
                </span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">
                  From Papa: ₹
                  {Number(stats?.familyMoney?.devangi?.papaReceived || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-rose-600 block mt-0.5">
                  Sent to Papa: ₹
                  {Number(stats?.familyMoney?.devangi?.papaSent || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Shrikesh Section for Admin */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-sky-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  S
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Shrikesh Overview</h3>
                  <p className="text-xs text-slate-500">Office Attendance, Daily Kharcha & Family Money</p>
                </div>
              </div>
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Shrikesh
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Office Attendance */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold block uppercase">
                  Office Attendance ({selectedMonth})
                </span>
                <span className="text-xl font-black text-slate-800 mt-1 block">
                  🟢 {stats?.office?.workingDays || 0} / 🟡 {stats?.office?.leaveByOffice || 0} / 🔴{' '}
                  {stats?.office?.leaveTaken || 0}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">Attendance Status</span>
              </div>

              {/* Daily Kharcha */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold block uppercase">
                  Monthly Expenses
                </span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">
                  ₹{Number(stats?.kharcha?.shrikesh?.monthExpense || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Cash: ₹{Number(stats?.kharcha?.shrikesh?.cashExpense || 0).toLocaleString('en-IN')} •
                  Online: ₹
                  {Number(stats?.kharcha?.shrikesh?.onlineExpense || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Family Money */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 font-semibold block uppercase">
                  Family Money
                </span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">
                  Received: ₹
                  {Number(stats?.familyMoney?.shrikesh?.received || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-rose-600 block mt-0.5">
                  Sent: ₹{Number(stats?.familyMoney?.shrikesh?.sent || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        initialTab={quickAddTab}
        onSuccess={fetchStats}
      />
    </div>
  );
}
