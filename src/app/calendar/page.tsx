'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AdminCalendarNote } from '@/types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Tag,
  Clock,
  Sparkles,
  ShieldAlert,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

export default function AdminCalendarPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [notes, setNotes] = useState<AdminCalendarNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected date & note modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedNote, setSelectedNote] = useState<AdminCalendarNote | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [tagInput, setTagInput] = useState('Meeting');
  const [savingNote, setSavingNote] = useState(false);

  const isAdmin = role === 'admin';

  const fetchNotes = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const monthStr = format(currentMonth, 'yyyy-MM');
      const res = await fetch(`/api/calendar-notes?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, isAdmin]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  if (!isAdmin) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Admin Only Area</h2>
        <p className="text-sm text-slate-500">The Admin Calendar is exclusively for Admin notes and reminders.</p>
      </div>
    );
  }

  // Map notes by date string
  const notesByDate = new Map<string, AdminCalendarNote[]>();
  notes.forEach(n => {
    const arr = notesByDate.get(n.note_date) || [];
    arr.push(n);
    notesByDate.set(n.note_date, arr);
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    const dateStr = format(day, 'yyyy-MM-dd');
    const existing = notesByDate.get(dateStr);
    if (existing && existing.length > 0) {
      setSelectedNote(existing[0]);
      setTitleInput(existing[0].title || '');
      setNoteInput(existing[0].note);
      setTagInput(existing[0].tag || 'Meeting');
    } else {
      setSelectedNote(null);
      setTitleInput('');
      setNoteInput('');
      setTagInput('Meeting');
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !noteInput.trim()) return;

    setSavingNote(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    try {
      const url = '/api/calendar-notes';
      const method = selectedNote ? 'PUT' : 'POST';
      const body: any = {
        title: titleInput,
        note: noteInput.trim(),
        tag: tagInput,
      };

      if (selectedNote) {
        body.id = selectedNote.id;
      } else {
        body.note_date = dateStr;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast(`Note saved for ${dateStr}!`, 'success');
        setSelectedDate(null);
        setSelectedNote(null);
        fetchNotes();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save note', 'error');
      }
    } catch {
      toast('Failed to save note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const res = await fetch(`/api/calendar-notes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Note deleted', 'info');
        setSelectedDate(null);
        setSelectedNote(null);
        fetchNotes();
      }
    } catch {
      toast('Failed to delete note', 'error');
    }
  };

  const tagColors: Record<string, string> = {
    'Meeting with school': 'bg-purple-100 text-purple-700 border-purple-200',
    'Payment received': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Important reminder': 'bg-amber-100 text-amber-700 border-amber-200',
    Holiday: 'bg-rose-100 text-rose-700 border-rose-200',
    'Personal work': 'bg-sky-100 text-sky-700 border-sky-200',
    'Follow-up required': 'bg-orange-100 text-orange-700 border-orange-200',
    General: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const standardTags = [
    'Meeting with school',
    'Payment received',
    'Important reminder',
    'Holiday',
    'Personal work',
    'Follow-up required',
    'General',
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-100">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Admin Calendar</h1>
            <p className="text-xs text-slate-500">
              Personal calendar with interactive click-to-note notes, reminders & tags
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Calendar View */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <span className="text-xs text-slate-400">Click any date to add or view notes</span>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-2 text-center my-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-xs font-bold uppercase text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayNotes = notesByDate.get(dateStr) || [];
            const hasNotes = dayNotes.length > 0;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentToday = isToday(day);

            return (
              <button
                key={dateStr}
                onClick={() => handleDateClick(day)}
                className={`min-h-[90px] sm:min-h-[105px] p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                  !isCurrentMonth
                    ? 'opacity-30 bg-slate-50/20 border-transparent'
                    : hasNotes
                    ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-100/50 hover:border-amber-300'
                    : 'bg-slate-50/50 border-slate-100 hover:bg-indigo-50/40 hover:border-indigo-200'
                } ${isCurrentToday ? 'ring-2 ring-indigo-500 shadow-sm' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                      isCurrentToday
                        ? 'bg-indigo-600 text-white'
                        : isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {hasNotes && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100 shadow-sm" />
                  )}
                </div>

                {hasNotes && (
                  <div className="mt-1 space-y-1 w-full overflow-hidden">
                    {dayNotes.slice(0, 2).map(n => (
                      <div
                        key={n.id}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate border ${
                          tagColors[n.tag] || tagColors.General
                        }`}
                      >
                        {n.title || n.note}
                      </div>
                    ))}
                    {dayNotes.length > 2 && (
                      <span className="text-[9px] text-slate-400 block">
                        +{dayNotes.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Note Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-amber-600">Admin Note</span>
                <h3 className="text-lg font-bold text-slate-800">
                  {format(selectedDate, 'EEEE, d MMMM yyyy')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Tag / Category
                </label>
                <select
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {standardTags.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meeting with school principal"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Note Details *
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Discuss salary revision, payment received for tuition, important reminder..."
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {selectedNote ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingNote}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-100 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingNote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{selectedNote ? 'Update Note' : 'Save Note'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
