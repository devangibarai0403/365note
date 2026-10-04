'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ClassItem } from '@/types';
import { calculateDurationHours } from '@/lib/time-utils';
import { X, Wallet, GraduationCap, Users2, Clock, Check, Loader2 } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'kharcha' | 'classes' | 'family';
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'kharcha',
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'kharcha' | 'classes' | 'family'>(initialTab);
  const [loading, setLoading] = useState(false);

  // Classes list for dropdown
  const [classesList, setClassesList] = useState<ClassItem[]>([]);

  // Daily Kharcha state
  const [kharchaAmount, setKharchaAmount] = useState('');
  const [kharchaSpentOn, setKharchaSpentOn] = useState('');
  const [kharchaPaymentMode, setKharchaPaymentMode] = useState<'Cash' | 'Online'>('Online');
  const [kharchaDate, setKharchaDate] = useState(new Date().toISOString().split('T')[0]);

  // Class entry state
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromTime, setFromTime] = useState('05:00 PM');
  const [toTime, setToTime] = useState('07:00 PM');
  const [calculatedHours, setCalculatedHours] = useState(2);
  const [calculatedAmount, setCalculatedAmount] = useState(1000);
  const [classNotes, setClassNotes] = useState('');

  // Family Money state
  const [familyType, setFamilyType] = useState<'received' | 'sent'>('received');
  const [familyPerson, setFamilyPerson] = useState('');
  const [familyOtherName, setFamilyOtherName] = useState('');
  const [familyAmount, setFamilyAmount] = useState('');
  const [familyReason, setFamilyReason] = useState('');
  const [familyDate, setFamilyDate] = useState(new Date().toISOString().split('T')[0]);

  const canDoClasses = user?.role === 'admin' || user?.role === 'devangi';

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch classes when modal opens
  useEffect(() => {
    if (isOpen && canDoClasses) {
      fetch('/api/classes')
        .then(res => res.json())
        .then(data => {
          if (data.classes && data.classes.length > 0) {
            setClassesList(data.classes);
            if (!selectedClassId) {
              const firstClass = data.classes[0];
              setSelectedClassId(firstClass.id);
              if (firstClass.subjects && firstClass.subjects.length > 0) {
                setSelectedSubjectId(firstClass.subjects[0].id);
              }
            }
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen, canDoClasses, selectedClassId]);

  // When selected class changes, sync subject
  useEffect(() => {
    if (selectedClassId && classesList.length > 0) {
      const cls = classesList.find(c => c.id === selectedClassId);
      const subjs = cls?.subjects || [];
      if (subjs.length > 0) {
        const currentValid = subjs.some(s => s.id === selectedSubjectId);
        if (!currentValid) {
          setSelectedSubjectId(subjs[0].id);
        }
      } else {
        setSelectedSubjectId('');
      }
    }
  }, [selectedClassId, classesList, selectedSubjectId]);

  // Recalculate class hours & amount
  useEffect(() => {
    if (activeTab === 'classes' && selectedClassId) {
      const cls = classesList.find(c => c.id === selectedClassId);
      const subjs = cls?.subjects || [];
      const matchedSubj = subjs.find(s => s.id === selectedSubjectId) || subjs[0];
      const rate = matchedSubj ? Number(matchedSubj.hourly_rate) : 0;
      const hours = calculateDurationHours(fromTime, toTime);
      setCalculatedHours(hours);
      setCalculatedAmount(Math.round(hours * rate * 100) / 100);
    }
  }, [fromTime, toTime, selectedClassId, selectedSubjectId, classesList, activeTab]);

  // Set default person based on role
  useEffect(() => {
    if (user?.role === 'devangi') {
      setFamilyPerson('Papa');
    } else if (user?.role === 'shrikesh') {
      setFamilyPerson('Amma');
    } else {
      setFamilyPerson('Papa');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleKharchaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kharchaAmount || !kharchaSpentOn) {
      toast('Please enter amount and what it was spent on', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/kharcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(kharchaAmount),
          spent_on: kharchaSpentOn,
          payment_mode: kharchaPaymentMode,
          expense_date: kharchaDate,
        }),
      });

      if (res.ok) {
        toast(`₹${kharchaAmount} spent on "${kharchaSpentOn}" saved!`);
        setKharchaAmount('');
        setKharchaSpentOn('');
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save expense', 'error');
      }
    } catch {
      toast('Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      toast('Please select a class', 'error');
      return;
    }

    setLoading(true);
    try {
      const selectedClass = classesList.find(c => c.id === selectedClassId);
      const subjs = selectedClass?.subjects || [];
      const matchedSubj = subjs.find(s => s.id === selectedSubjectId) || subjs[0];

      const res = await fetch('/api/class-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          class_name: selectedClass?.name,
          subject_id: matchedSubj?.id,
          subject_name: matchedSubj?.subject_name,
          record_date: classDate,
          from_time: fromTime,
          to_time: toTime,
          hours: calculatedHours,
          notes: classNotes,
        }),
      });

      if (res.ok) {
        toast(`Class record saved: ${calculatedHours} hrs (₹${calculatedAmount})`);
        setClassNotes('');
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save class record', 'error');
      }
    } catch {
      toast('Failed to save class record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPerson = familyPerson === 'Others' ? familyOtherName : familyPerson;

    if (!finalPerson || !familyAmount) {
      toast('Please enter person and amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/family-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_date: familyDate,
          transaction_type: familyType,
          person_name: finalPerson,
          amount: Number(familyAmount),
          reason: familyReason,
        }),
      });

      if (res.ok) {
        toast(`Family transaction of ₹${familyAmount} saved!`);
        setFamilyAmount('');
        setFamilyReason('');
        setFamilyOtherName('');
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save transaction', 'error');
      }
    } catch {
      toast('Failed to save transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Family dropdown options by user
  const getFamilyOptions = () => {
    if (user?.role === 'devangi') {
      return ['Papa', 'Chetna', 'Dhaval', 'Mummy', 'Others'];
    }
    if (user?.role === 'shrikesh') {
      return ['Amma', 'Shrivas', 'Shriraj', 'Others'];
    }
    return ['Papa', 'Amma', 'Chetna', 'Dhaval', 'Mummy', 'Shrivas', 'Shriraj', 'Others'];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Quick Daily Entry</h3>
            <p className="text-xs text-slate-500">Record fast updates in seconds</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 p-2 bg-slate-50/70 gap-2">
          <button
            onClick={() => setActiveTab('kharcha')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'kharcha'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Daily Kharcha
          </button>

          {canDoClasses && (
            <button
              onClick={() => setActiveTab('classes')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'classes'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Classes
            </button>
          )}

          <button
            onClick={() => setActiveTab('family')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'family'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            <Users2 className="w-4 h-4" />
            Family Money
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: DAILY KHARCHA */}
          {activeTab === 'kharcha' && (
            <form onSubmit={handleKharchaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Amount Spent (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="e.g. 10 or 250"
                    value={kharchaAmount}
                    onChange={e => setKharchaAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Even ₹10 for chai/auto can be recorded instantly.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Amount Spent On *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tea, Travel, Stationary, Snack"
                  value={kharchaSpentOn}
                  onChange={e => setKharchaSpentOn(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Payment Mode *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKharchaPaymentMode('Cash')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        kharchaPaymentMode === 'Cash'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setKharchaPaymentMode('Online')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        kharchaPaymentMode === 'Online'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
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
                    value={kharchaDate}
                    onChange={e => setKharchaDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Expense
              </button>
            </form>
          )}

          {/* TAB 2: CLASSES (DEVANGI / ADMIN) */}
          {activeTab === 'classes' && canDoClasses && (
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Select Class *
                </label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {classesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const currentClass = classesList.find(c => c.id === selectedClassId);
                const subjs = currentClass?.subjects || [];
                if (subjs.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      Select Subject *
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={e => setSelectedSubjectId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {subjs.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.subject_name} — ₹{s.hourly_rate}/hr
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={classDate}
                  onChange={e => setClassDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    From Time *
                  </label>
                  <input
                    type="text"
                    value={fromTime}
                    onChange={e => setFromTime(e.target.value)}
                    placeholder="05:00 PM"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    To Time *
                  </label>
                  <input
                    type="text"
                    value={toTime}
                    onChange={e => setToTime(e.target.value)}
                    placeholder="07:00 PM"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Automatic Calculation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Calculated Hours</span>
                    <span className="text-base font-bold text-slate-800">
                      {calculatedHours} Hours
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Earnings</span>
                  <span className="text-xl font-extrabold text-indigo-700">
                    ₹{calculatedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Chapter or topics covered"
                  value={classNotes}
                  onChange={e => setClassNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Class Record
              </button>
            </form>
          )}

          {/* TAB 3: FAMILY MONEY */}
          {activeTab === 'family' && (
            <form onSubmit={handleFamilySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFamilyType('received')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    familyType === 'received'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  📥 Money Received
                </button>
                <button
                  type="button"
                  onClick={() => setFamilyType('sent')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    familyType === 'sent'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  📤 Money Sent
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Family Member *
                  </label>
                  <select
                    value={familyPerson}
                    onChange={e => setFamilyPerson(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {getFamilyOptions().map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="e.g. 5000"
                      value={familyAmount}
                      onChange={e => setFamilyAmount(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {familyPerson === 'Others' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Name of Person *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Uncle, Mama, Friend"
                    value={familyOtherName}
                    onChange={e => setFamilyOtherName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly maintenance, Medical expense, Gift"
                  value={familyReason}
                  onChange={e => setFamilyReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={familyDate}
                  onChange={e => setFamilyDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Family Transaction
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
