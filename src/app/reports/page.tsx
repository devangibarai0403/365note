'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  Calendar,
  GraduationCap,
  School as SchoolIcon,
  Building2,
  Wallet,
  Users2,
  Printer,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export default function ReportsPage() {
  const { user, role } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/monthly?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  // Month selector options
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  return (
    <div className="space-y-8 animate-in fade-in print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Monthly Reports</h1>
            <p className="text-xs text-slate-500">
              Detailed financial and attendance statement for {selectedMonth}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
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
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-400">Compiling monthly report...</p>
        </div>
      ) : !report ? (
        <div className="p-8 bg-white rounded-3xl text-center">
          <p className="text-sm text-slate-500">Unable to load report for {selectedMonth}.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Classes Section (Devangi & Admin) */}
          {report.classes && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-800">Classes Statement</h3>
                </div>
                <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                  Total Earnings: ₹{Number(report.classes.totalEarnings || 0).toLocaleString('en-IN')}
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Classes
                  </span>
                  <span className="text-lg font-black text-slate-800">
                    {report.classes.totalClasses || 0} ({report.classes.totalHours || 0} hrs)
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl text-center">
                  <span className="text-[10px] text-indigo-700 uppercase font-bold block">
                    Total Billed
                  </span>
                  <span className="text-lg font-black text-indigo-700">
                    ₹{Number(report.classes.totalEarnings || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Total Paid
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    ₹{Number(report.classes.totalPaid || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">
                    Pending In Balance
                  </span>
                  <span className="text-lg font-black text-amber-700">
                    ₹{Number(report.classes.totalBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Class-wise Breakdown */}
              {report.classes.byClass && report.classes.byClass.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                    Class-wise Summary & Payment Status
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.classes.byClass.map((c: any) => (
                      <div
                        key={c.name}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                          {c.status === 'full_paid' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              🟢 Full Paid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                              🟡 ₹{Number(c.balanceDue || 0).toLocaleString('en-IN')} In Balance
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                          <span>{c.hours} hrs • {c.count} sessions</span>
                          <span className="font-bold text-slate-800">
                            Total: ₹{Number(c.earnings).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Paid: ₹{Number(c.paid || 0).toLocaleString('en-IN')}</span>
                          <span>(Cash: ₹{c.cashPaid || 0} • Online: ₹{c.onlinePaid || 0})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. School Attendance Section (Devangi & Admin) */}
          {report.school && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <SchoolIcon className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-800">
                    School Attendance Statement
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {report.school.totalDaysMarked || 0} Days Tracked
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Working Days (🟢)
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    {report.school.workingDays || 0}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">
                    Leave by School (🟡)
                  </span>
                  <span className="text-xl font-black text-amber-700">
                    {report.school.leaveBySchool || 0}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-center">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">
                    Leave Taken by You (🔴)
                  </span>
                  <span className="text-xl font-black text-rose-700">
                    {report.school.leaveTaken || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Office Attendance Section (Shrikesh & Admin) */}
          {report.office && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-800">
                    Office Attendance Statement
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {report.office.totalDaysMarked || 0} Days Tracked
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Working Days (🟢)
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    {report.office.workingDays || 0}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-center">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">
                    Leave by Office (🟡)
                  </span>
                  <span className="text-xl font-black text-amber-700">
                    {report.office.leaveByOffice || 0}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-center">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">
                    Leave Taken by You (🔴)
                  </span>
                  <span className="text-xl font-black text-rose-700">
                    {report.office.leaveTaken || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Daily Kharcha Section (All Users) */}
          {report.kharcha && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-5 h-5 text-rose-600" />
                  <h3 className="text-base font-bold text-slate-800">Daily Kharcha Statement</h3>
                </div>
                <div className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full">
                  Total Spent: ₹{Number(report.kharcha.total || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Expense
                  </span>
                  <span className="text-xl font-black text-slate-800">
                    ₹{Number(report.kharcha.total || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Paid via Cash
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    ₹{Number(report.kharcha.cash || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl text-center">
                  <span className="text-[10px] text-sky-700 uppercase font-bold block">
                    Paid via Online
                  </span>
                  <span className="text-xl font-black text-sky-700">
                    ₹{Number(report.kharcha.online || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Records table preview */}
              {report.kharcha.records && report.kharcha.records.length > 0 && (
                <div className="pt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                        <th className="py-2 px-2">Date</th>
                        {role === 'admin' && <th className="py-2 px-2">User</th>}
                        <th className="py-2 px-2">Spent On</th>
                        <th className="py-2 px-2">Mode</th>
                        <th className="py-2 px-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.kharcha.records.slice(0, 10).map((r: any) => (
                        <tr key={r.id}>
                          <td className="py-2 px-2 text-slate-600">{r.expense_date}</td>
                          {role === 'admin' && (
                            <td className="py-2 px-2 capitalize font-bold text-slate-700">
                              {r.user_id}
                            </td>
                          )}
                          <td className="py-2 px-2 font-medium text-slate-800">{r.spent_on}</td>
                          <td className="py-2 px-2 text-slate-500">{r.payment_mode}</td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800">
                            ₹{Number(r.amount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.kharcha.records.length > 10 && (
                    <p className="text-[11px] text-slate-400 mt-2 text-center">
                      Showing first 10 of {report.kharcha.records.length} items. See Daily Kharcha
                      page for complete list.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Family Money Section (All Users) */}
          {report.familyMoney && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Users2 className="w-5 h-5 text-pink-600" />
                  <h3 className="text-base font-bold text-slate-800">Family Money Statement</h3>
                </div>
                <div className="text-xs font-bold text-slate-700">
                  Net Balance:{' '}
                  <span
                    className={
                      Number(report.familyMoney.netFlow || 0) >= 0
                        ? 'text-emerald-700 font-extrabold'
                        : 'text-rose-700 font-extrabold'
                    }
                  >
                    ₹{Number(report.familyMoney.netFlow || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    Total Received
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    ₹{Number(report.familyMoney.totalReceived || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-center">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">
                    Total Sent
                  </span>
                  <span className="text-xl font-black text-rose-700">
                    ₹{Number(report.familyMoney.totalSent || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {role === 'devangi' && (
                  <div className="p-3 bg-purple-50 rounded-xl text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-purple-700 uppercase font-bold block">
                      From Papa
                    </span>
                    <span className="text-xl font-black text-purple-700">
                      ₹{Number(report.familyMoney.papaReceived || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
