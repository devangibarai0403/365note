'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { UserTask, TaskPriority, TaskStatus } from '@/types';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Tag,
  ListTodo,
  CheckCheck,
  Sparkles,
  Loader2,
  X,
  User,
  ArrowRight,
} from 'lucide-react';

export default function DailyPlannerPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    todoCount: 0,
    doneCount: 0,
    completionRate: 0,
    categoryBreakdown: {} as Record<string, { total: number; done: number; todo: number }>,
    dailyBreakdown: {} as Record<string, { total: number; done: number; todo: number }>,
  });

  // Navigation tab: 'daily' | 'weekly' | 'monthly'
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Date filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Week start calculation (Monday of week)
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    return monday.toISOString().split('T')[0];
  });

  // Month calculation (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // User filter for Admin
  const [adminUserFilter, setAdminUserFilter] = useState(''); // '' = self or all, 'devangi', 'shrikesh'

  // Search & category filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all');

  // Task Entry Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState(todayStr);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskCategory, setTaskCategory] = useState('General');
  const [taskNotes, setTaskNotes] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Common category presets
  const categoryPresets = ['General', 'Work', 'Classes', 'School', 'Personal', 'Family', 'Meeting', 'Errands'];

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/tasks?period=${activeTab}`;
      if (activeTab === 'daily') {
        url += `&date=${selectedDate}`;
      } else if (activeTab === 'weekly') {
        url += `&week_start=${selectedWeekStart}`;
      } else if (activeTab === 'monthly') {
        url += `&month=${selectedMonth}`;
      }

      if (categoryFilter !== 'all') url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (role === 'admin' && adminUserFilter) url += `&user=${adminUserFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setSummary(data.summary || {
          total: 0,
          todoCount: 0,
          doneCount: 0,
          completionRate: 0,
          categoryBreakdown: {},
          dailyBreakdown: {},
        });
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate, selectedWeekStart, selectedMonth, categoryFilter, statusFilter, role, adminUserFilter, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Open Add Task Modal
  const handleOpenAddModal = (presetStatus: TaskStatus = 'todo', date?: string) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDate(date || (activeTab === 'daily' ? selectedDate : todayStr));
    setTaskStatus(presetStatus);
    setTaskPriority('medium');
    setTaskCategory('General');
    setTaskNotes('');
    setTargetUser(role === 'admin' && adminUserFilter ? adminUserFilter : user?.username || '');
    setShowModal(true);
  };

  // Open Edit Task Modal
  const handleOpenEditModal = (t: UserTask) => {
    setEditingTask(t);
    setTaskTitle(t.title);
    setTaskDate(t.task_date);
    setTaskStatus(t.status);
    setTaskPriority(t.priority);
    setTaskCategory(t.category);
    setTaskNotes(t.notes || '');
    setTargetUser(t.user_id);
    setShowModal(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast('Task title is required', 'error');
      return;
    }

    setSavingTask(true);
    try {
      const url = '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';
      const body: any = {
        title: taskTitle.trim(),
        task_date: taskDate,
        status: taskStatus,
        priority: taskPriority,
        category: taskCategory.trim() || 'General',
        notes: taskNotes.trim() || undefined,
      };

      if (editingTask) {
        body.id = editingTask.id;
      } else if (role === 'admin' && targetUser) {
        body.target_user = targetUser;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast(
          editingTask
            ? 'Task updated successfully'
            : taskStatus === 'done'
            ? 'Accomplishment logged as Done! 🌟'
            : 'New task added to To Do list! 📝',
          'success'
        );
        setShowModal(false);
        fetchTasks();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save task', 'error');
      }
    } catch {
      toast('Failed to save task', 'error');
    } finally {
      setSavingTask(false);
    }
  };

  // 1-Click Toggle Status (To Do <-> Done)
  const handleToggleStatus = async (task: UserTask) => {
    const nextStatus: TaskStatus = task.status === 'todo' ? 'done' : 'todo';
    try {
      // Optimistic update
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, status: nextStatus, completed_at: nextStatus === 'done' ? new Date().toISOString() : null }
            : t
        )
      );

      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        if (nextStatus === 'done') {
          toast(`Completed: "${task.title}" 🎉`, 'success');
        } else {
          toast(`Moved back to To Do: "${task.title}"`, 'info');
        }
        fetchTasks();
      } else {
        toast('Failed to update status', 'error');
        fetchTasks();
      }
    } catch {
      toast('Failed to update status', 'error');
      fetchTasks();
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete task "${title}"?`)) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Task deleted', 'info');
        fetchTasks();
      } else {
        toast('Failed to delete task', 'error');
      }
    } catch {
      toast('Failed to delete task', 'error');
    }
  };

  // Handle Export Excel
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      let url = `/api/tasks/export?period=${activeTab}`;
      if (activeTab === 'daily') url += `&date=${selectedDate}`;
      else if (activeTab === 'weekly') url += `&week_start=${selectedWeekStart}`;
      else if (activeTab === 'monthly') url += `&month=${selectedMonth}`;

      if (categoryFilter !== 'all') url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (role === 'admin' && adminUserFilter) url += `&user=${adminUserFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      const contentDisposition = res.headers.get('content-disposition');
      let filename = `tasks_report_${activeTab}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast(`Excel report downloaded: ${filename}`, 'success');
    } catch (e: any) {
      toast(e.message || 'Export failed', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  // Handle Print / PDF Export
  const handleExportPdf = () => {
    window.print();
  };

  // Date Navigation Helpers
  const shiftDay = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const shiftWeek = (weeks: number) => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + weeks * 7);
    setSelectedWeekStart(d.toISOString().split('T')[0]);
  };

  const shiftMonth = (months: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Filter tasks by search query
  const filteredTasks = tasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  // Days array for weekly view
  const weekDays = useMemo(() => {
    const start = new Date(selectedWeekStart);
    const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [selectedWeekStart, todayStr]);

  // Priority color helper
  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">Urgent</span>;
      case 'high':
        return <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">High</span>;
      case 'medium':
        return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">Medium</span>;
      case 'low':
        return <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Low</span>;
      default:
        return null;
    }
  };

  const pageTitle =
    role === 'devangi'
      ? "Devangi's Daily Planner"
      : role === 'shrikesh'
      ? "Shrikesh's Daily Planner"
      : 'Executive Daily Planner';

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Printable Header - Only visible when printing to PDF */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-black text-slate-900">{pageTitle}</h1>
        <p className="text-sm text-slate-600">
          Period: <span className="font-bold uppercase">{activeTab}</span> • User:{' '}
          <span className="font-bold">{role === 'admin' ? (adminUserFilter || 'All Users') : user?.display_name}</span> • Generated:{' '}
          {new Date().toLocaleString('en-IN')}
        </p>
        <div className="flex gap-6 mt-3 text-xs">
          <span>Total Tasks: <strong>{summary.total}</strong></span>
          <span>Done: <strong>{summary.doneCount}</strong></span>
          <span>To Do: <strong>{summary.todoCount}</strong></span>
          <span>Completion Rate: <strong>{summary.completionRate}%</strong></span>
        </div>
      </div>

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-100">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{pageTitle}</h1>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Action Tracker
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage daily to-dos, track completed accomplishments, and analyze productivity reports
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Admin User Filter */}
          {role === 'admin' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
              <User className="w-3.5 h-3.5 ml-1.5 text-slate-500" />
              <select
                value={adminUserFilter}
                onChange={e => setAdminUserFilter(e.target.value)}
                className="bg-transparent pl-1 pr-2 py-1 outline-none text-xs font-bold cursor-pointer"
              >
                <option value="">All Users</option>
                <option value="devangi">Devangi's Tasks</option>
                <option value="shrikesh">Shrikesh's Tasks</option>
              </select>
            </div>
          )}

          {/* Quick Add Button */}
          <button
            onClick={() => handleOpenAddModal('todo')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>

          {/* Direct "Log Accomplishment" Button */}
          <button
            onClick={() => handleOpenAddModal('done')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-all"
            title="Log an item that was already completed"
          >
            <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Log Done Task</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            title="Download Excel Spreadsheet"
          >
            {exportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            <span>Export Excel</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            title="Print or Save Report as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-rose-500" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Report Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{summary.total}</h3>
          <span className="text-[10px] text-slate-400 capitalize">{activeTab} scope</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/50">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed (Done)</span>
          </span>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">{summary.doneCount}</h3>
          <span className="text-[10px] text-emerald-600/80">Tasks accomplished</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending (To Do)</span>
          </span>
          <h3 className="text-2xl font-black text-amber-700 mt-1">{summary.todoCount}</h3>
          <span className="text-[10px] text-amber-600/80">Pending action</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-white to-indigo-50/50">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Completion Rate</span>
          </span>
          <h3 className="text-2xl font-black text-indigo-700 mt-1">{summary.completionRate}%</h3>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        {/* Navigation Tabs & Date Range Controller */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 print:hidden">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'daily'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Daily Tasks
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'weekly'
                  ? 'bg-white text-indigo-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📊 Weekly Tasks
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'monthly'
                  ? 'bg-white text-violet-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Monthly Report
            </button>
          </div>

          {/* Date Range Navigation Based on Tab */}
          <div className="flex items-center gap-2">
            {activeTab === 'daily' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-2xl">
                <button
                  onClick={() => shiftDay(-1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="text-[10px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => shiftDay(1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeTab === 'weekly' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-2xl">
                <button
                  onClick={() => shiftWeek(-1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2">
                  Week of {selectedWeekStart}
                </span>
                <button
                  onClick={() => shiftWeek(1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-2xl">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2">{selectedMonth}</span>
                <button
                  onClick={() => shiftMonth(1)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks, categories, or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">All Categories</option>
              {Object.keys(summary.categoryBreakdown).map(c => (
                <option key={c} value={c}>
                  {c} ({summary.categoryBreakdown[c].total})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="todo">Pending (To Do)</option>
              <option value="done">Completed (Done)</option>
            </select>
          </div>
        </div>

        {/* LOADING INDICATOR */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            <p className="text-xs text-slate-400 font-medium">Loading your planner...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
              <CheckSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No tasks found for this view</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't scheduled any tasks yet. Click below to add your first to-do item or log an accomplishment!
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handleOpenAddModal('todo')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
              >
                + Add To Do Task
              </button>
              <button
                onClick={() => handleOpenAddModal('done')}
                className="px-4 py-2 bg-teal-50 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 transition-all"
              >
                Log Done Task
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* 1. DAILY VIEW: TWO COLUMNS (TO DO vs DONE)                   */}
            {/* ============================================================ */}
            {activeTab === 'daily' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: TO DO TASKS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        To Do ({todoTasks.length})
                      </h2>
                    </div>
                    <button
                      onClick={() => handleOpenAddModal('todo', selectedDate)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {todoTasks.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-1 bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-500">All caught up!</p>
                      <p className="text-[11px] text-slate-400">No pending to-do tasks for this day.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todoTasks.map(t => (
                        <div
                          key={t.id}
                          className="group p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              className="mt-0.5 text-slate-300 hover:text-emerald-600 transition-colors flex-shrink-0"
                              title="Mark as Done"
                            >
                              <Circle className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 leading-snug break-words">
                                {t.title}
                              </p>
                              {t.notes && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {t.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Edit Task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id, t.title)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100/60">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {t.category}
                              </span>
                              {getPriorityBadge(t.priority)}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-all flex items-center gap-1"
                            >
                              <span>Done</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column 2: DONE TASKS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                        Accomplished ({doneTasks.length})
                      </h2>
                    </div>
                    <button
                      onClick={() => handleOpenAddModal('done', selectedDate)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Done</span>
                    </button>
                  </div>

                  {doneTasks.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-1 bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-500">No accomplishments logged yet</p>
                      <p className="text-[11px] text-slate-400">Complete tasks on the left or click "+ Log Done".</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {doneTasks.map(t => (
                        <div
                          key={t.id}
                          className="group p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 shadow-2xs hover:shadow-md transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              className="mt-0.5 text-emerald-600 hover:text-amber-600 transition-colors flex-shrink-0"
                              title="Click to revert to To Do"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-600 line-through decoration-emerald-500/80 leading-snug break-words">
                                {t.title}
                              </p>
                              {t.notes && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                  {t.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Edit Task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id, t.title)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-100">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                                {t.category}
                              </span>
                              {getPriorityBadge(t.priority)}
                            </div>

                            <span className="text-[10px] text-emerald-700/80 font-medium">
                              Completed {t.completed_at ? new Date(t.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'today'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 2. WEEKLY VIEW: DAY-BY-DAY CARDS (MON - SUN)                 */}
            {/* ============================================================ */}
            {activeTab === 'weekly' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {weekDays.map(wd => {
                    const dayTasks = filteredTasks.filter(t => t.task_date === wd.dateStr);
                    const dayDone = dayTasks.filter(t => t.status === 'done');
                    const dayRate = dayTasks.length > 0 ? Math.round((dayDone.length / dayTasks.length) * 100) : 0;

                    return (
                      <div
                        key={wd.dateStr}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          wd.isToday
                            ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2.5">
                          <div>
                            <span className="text-[11px] font-bold uppercase text-slate-400 block">
                              {wd.dayName}
                            </span>
                            <span className="text-base font-black text-slate-800">
                              {wd.dayNum}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 block">
                              {dayDone.length}/{dayTasks.length}
                            </span>
                            <span className="text-[10px] font-black text-emerald-700">
                              {dayRate}%
                            </span>
                          </div>
                        </div>

                        {/* Task List for day */}
                        <div className="space-y-1.5 min-h-[140px] max-h-[300px] overflow-y-auto">
                          {dayTasks.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-6">
                              No tasks
                            </div>
                          ) : (
                            dayTasks.map(t => (
                              <div
                                key={t.id}
                                onClick={() => handleToggleStatus(t)}
                                className={`p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                                  t.status === 'done'
                                    ? 'bg-emerald-100/60 border-emerald-200 text-slate-500 line-through'
                                    : 'bg-white border-slate-200 text-slate-800 shadow-2xs hover:border-emerald-300'
                                }`}
                                title="Click to toggle status"
                              >
                                <p className="font-bold truncate text-[11px]">{t.title}</p>
                                <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
                                  <span>{t.category}</span>
                                  <span className="capitalize">{t.priority}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenAddModal('todo', wd.dateStr)}
                          className="w-full mt-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-colors border border-dashed border-slate-200"
                        >
                          + Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 3. MONTHLY VIEW: EXECUTIVE REPORT STRUCTURE                  */}
            {/* ============================================================ */}
            {activeTab === 'monthly' && (
              <div className="space-y-6">
                {/* Category Analytics Pill Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  {Object.keys(summary.categoryBreakdown).map(cat => {
                    const cData = summary.categoryBreakdown[cat];
                    const rate = cData.total > 0 ? Math.round((cData.done / cData.total) * 100) : 0;
                    return (
                      <div key={cat} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase truncate block">
                          {cat}
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-base font-black text-slate-800">
                            {cData.done}/{cData.total}
                          </span>
                          <span className="text-xs font-black text-emerald-600">{rate}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Report Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                        <th className="py-2.5 px-3">Date</th>
                        {role === 'admin' && <th className="py-2.5 px-3">User</th>}
                        <th className="py-2.5 px-3">Task Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Completed At</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTasks.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {t.task_date}
                          </td>

                          {role === 'admin' && (
                            <td className="py-3 px-3 font-bold text-indigo-700 capitalize">
                              {t.user_id}
                            </td>
                          )}

                          <td className="py-3 px-3">
                            <span
                              className={`font-bold block ${
                                t.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-900'
                              }`}
                            >
                              {t.title}
                            </span>
                            {t.notes && <span className="text-[11px] text-slate-400 block mt-0.5">{t.notes}</span>}
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {t.category}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {getPriorityBadge(t.priority)}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 transition-all ${
                                t.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                            >
                              {t.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Circle className="w-3.5 h-3.5 text-amber-600" />}
                              <span>{t.status === 'done' ? 'Done' : 'To Do'}</span>
                            </button>
                          </td>

                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {t.completed_at ? new Date(t.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id, t.title)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* TASK CREATE / EDIT MODAL                                      */}
      {/* ============================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-600">
                  {editingTask ? 'Edit Task' : 'Quick Task Entry'}
                </span>
                <h3 className="text-lg font-black text-slate-800">
                  {editingTask ? 'Update Task Details' : taskStatus === 'done' ? 'Log Accomplished Task' : 'Add New To Do'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Science 9th notes preparation, Office billing, Plumber call"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Status Radio: To Do vs Done (Requirement: user can enter done task directly) */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Initial Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskStatus('todo')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      taskStatus === 'todo'
                        ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs ring-2 ring-amber-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Circle className="w-3.5 h-3.5 text-amber-600" />
                    <span>To Do (Pending)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskStatus('done')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      taskStatus === 'done'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs ring-2 ring-emerald-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Done (Accomplished)</span>
                  </button>
                </div>
              </div>

              {/* Date & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={e => setTaskDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Category & Presets */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Work, Classes, School, Personal"
                  value={taskCategory}
                  onChange={e => setTaskCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {categoryPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTaskCategory(preset)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                        taskCategory === preset
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Notes / Extra Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context, links, or contact numbers..."
                  value={taskNotes}
                  onChange={e => setTaskNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Admin target user selection */}
              {role === 'admin' && !editingTask && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Assign Task To
                  </label>
                  <select
                    value={targetUser}
                    onChange={e => setTargetUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="devangi">Devangi</option>
                    <option value="shrikesh">Shrikesh</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {savingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTask ? 'Update Task' : taskStatus === 'done' ? 'Save Accomplishment' : 'Add Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
