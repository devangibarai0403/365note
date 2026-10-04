import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getMonthDateRange } from '@/lib/time-utils';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'daily'; // 'daily' | 'weekly' | 'monthly' | 'all'
  const dateParam = searchParams.get('date');
  const weekStartParam = searchParams.get('week_start');
  const monthParam = searchParams.get('month');
  const statusFilter = searchParams.get('status');
  const categoryFilter = searchParams.get('category');
  const targetUserParam = searchParams.get('user');

  let effectiveUser = currentUser.username;
  if (currentUser.role === 'admin' && targetUserParam && targetUserParam !== 'all') {
    effectiveUser = targetUserParam;
  }

  try {
    let sql = `
      SELECT 
        id, 
        user_id, 
        title, 
        status, 
        priority, 
        category, 
        TO_CHAR(task_date, 'YYYY-MM-DD') as task_date, 
        TO_CHAR(completed_at, 'YYYY-MM-DD HH24:MI') as completed_at, 
        notes, 
        created_at
      FROM public.user_tasks
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!(currentUser.role === 'admin' && targetUserParam === 'all')) {
      params.push(effectiveUser);
      sql += ` AND user_id = $${params.length}`;
    }

    if (period === 'daily') {
      const targetDate = dateParam || new Date().toISOString().split('T')[0];
      params.push(targetDate);
      sql += ` AND task_date = $${params.length}`;
    } else if (period === 'weekly') {
      let start = weekStartParam;
      let end = '';
      if (!start) {
        const now = new Date();
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        start = monday.toISOString().split('T')[0];
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        end = sunday.toISOString().split('T')[0];
      } else {
        const s = new Date(start);
        const e = new Date(s);
        e.setDate(s.getDate() + 6);
        end = e.toISOString().split('T')[0];
      }
      params.push(start);
      params.push(end);
      sql += ` AND task_date >= $${params.length - 1} AND task_date <= $${params.length}`;
    } else if (period === 'monthly') {
      const m = monthParam || new Date().toISOString().slice(0, 7);
      const { startDate, endDate } = getMonthDateRange(m);
      params.push(startDate);
      params.push(endDate);
      sql += ` AND task_date >= $${params.length - 1} AND task_date <= $${params.length}`;
    }

    if (statusFilter && statusFilter !== 'all') {
      params.push(statusFilter);
      sql += ` AND status = $${params.length}`;
    }

    if (categoryFilter && categoryFilter !== 'all') {
      params.push(categoryFilter);
      sql += ` AND category = $${params.length}`;
    }

    sql += ' ORDER BY task_date ASC, created_at ASC';

    const res = await query(sql, params);
    const rows = res.rows;

    let doneCount = 0;
    let todoCount = 0;
    const catMap: Record<string, { total: number; done: number; todo: number }> = {};

    const dataRows = rows.map((r: any, idx: number) => {
      const isDone = r.status === 'done';
      if (isDone) doneCount++;
      else todoCount++;

      const c = r.category || 'General';
      if (!catMap[c]) catMap[c] = { total: 0, done: 0, todo: 0 };
      catMap[c].total++;
      if (isDone) catMap[c].done++;
      else catMap[c].todo++;

      return {
        '#': idx + 1,
        'Date': r.task_date,
        'User': r.user_id === 'devangi' ? 'Devangi' : r.user_id === 'shrikesh' ? 'Shrikesh' : r.user_id,
        'Task Title': r.title,
        'Status': isDone ? 'Done (Completed)' : 'To Do (Pending)',
        'Priority': r.priority ? r.priority.toUpperCase() : 'MEDIUM',
        'Category': r.category || 'General',
        'Completed At': r.completed_at || '-',
        'Notes / Details': r.notes || '',
      };
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Tasks Log
    const wsTasks = XLSX.utils.json_to_sheet(dataRows);
    wsTasks['!cols'] = [
      { wch: 5 },  // #
      { wch: 12 }, // Date
      { wch: 12 }, // User
      { wch: 35 }, // Title
      { wch: 18 }, // Status
      { wch: 12 }, // Priority
      { wch: 16 }, // Category
      { wch: 18 }, // Completed At
      { wch: 30 }, // Notes
    ];
    XLSX.utils.book_append_sheet(workbook, wsTasks, 'Task Log');

    // Sheet 2: Executive Summary
    const total = rows.length;
    const rate = total > 0 ? `${Math.round((doneCount / total) * 100)}%` : '0%';

    const summaryOverview = [
      { 'Metric': 'Report Period', 'Value': period.toUpperCase() },
      { 'Metric': 'Target User', 'Value': effectiveUser },
      { 'Metric': 'Total Tasks', 'Value': total },
      { 'Metric': 'Completed (Done)', 'Value': doneCount },
      { 'Metric': 'Pending (To Do)', 'Value': todoCount },
      { 'Metric': 'Completion Rate', 'Value': rate },
      { 'Metric': 'Generated On', 'Value': new Date().toLocaleString('en-IN') },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryOverview);
    wsSummary['!cols'] = [{ wch: 22 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Executive Summary');

    // Sheet 3: Category Breakdown
    const catRows = Object.keys(catMap).map(k => ({
      'Category': k,
      'Total Tasks': catMap[k].total,
      'Completed': catMap[k].done,
      'Pending': catMap[k].todo,
      'Completion Rate': `${Math.round((catMap[k].done / catMap[k].total) * 100)}%`,
    }));
    if (catRows.length > 0) {
      const wsCat = XLSX.utils.json_to_sheet(catRows);
      wsCat['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, wsCat, 'Category Breakdown');
    }

    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `task_planner_${period}_${effectiveUser}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export tasks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
