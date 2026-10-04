import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getMonthDateRange } from '@/lib/time-utils';
import { UserTask } from '@/types';

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'daily'; // 'daily' | 'weekly' | 'monthly' | 'all'
  const dateParam = searchParams.get('date'); // YYYY-MM-DD
  const weekStartParam = searchParams.get('week_start'); // YYYY-MM-DD
  const monthParam = searchParams.get('month'); // YYYY-MM
  const statusFilter = searchParams.get('status'); // 'all' | 'todo' | 'done'
  const categoryFilter = searchParams.get('category');
  const targetUserParam = searchParams.get('user');

  // Determine effective user
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
        completed_at, 
        notes, 
        created_at, 
        updated_at
      FROM public.user_tasks
      WHERE 1=1
    `;
    const params: any[] = [];

    // User scope (admin can see 'all' if explicitly chosen, otherwise scoped)
    if (!(currentUser.role === 'admin' && targetUserParam === 'all')) {
      params.push(effectiveUser);
      sql += ` AND user_id = $${params.length}`;
    }

    // Period filter
    if (period === 'daily') {
      const targetDate = dateParam || new Date().toISOString().split('T')[0];
      params.push(targetDate);
      sql += ` AND task_date = $${params.length}`;
    } else if (period === 'weekly') {
      let start = weekStartParam;
      let end = '';
      if (!start) {
        // Calculate current week Monday to Sunday
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

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      params.push(statusFilter);
      sql += ` AND status = $${params.length}`;
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      params.push(categoryFilter);
      sql += ` AND category = $${params.length}`;
    }

    sql += ' ORDER BY task_date DESC, created_at DESC';

    const res = await query<UserTask>(sql, params);
    const tasks = res.rows;

    // Compute Summary & Analytics
    let todoCount = 0;
    let doneCount = 0;
    const categoryBreakdown: Record<string, { total: number; done: number; todo: number }> = {};
    const dailyBreakdown: Record<string, { total: number; done: number; todo: number }> = {};

    tasks.forEach(t => {
      if (t.status === 'done') doneCount++;
      else todoCount++;

      // Category aggregation
      const cat = t.category || 'General';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { total: 0, done: 0, todo: 0 };
      categoryBreakdown[cat].total++;
      if (t.status === 'done') categoryBreakdown[cat].done++;
      else categoryBreakdown[cat].todo++;

      // Daily aggregation
      const d = t.task_date;
      if (!dailyBreakdown[d]) dailyBreakdown[d] = { total: 0, done: 0, todo: 0 };
      dailyBreakdown[d].total++;
      if (t.status === 'done') dailyBreakdown[d].done++;
      else dailyBreakdown[d].todo++;
    });

    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    return NextResponse.json({
      tasks,
      summary: {
        total,
        todoCount,
        doneCount,
        completionRate,
        categoryBreakdown,
        dailyBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, task_date, status, priority, category, notes, target_user } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const taskStatus = status === 'done' ? 'done' : 'todo';
    const taskPriority = ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium';
    const taskCategory = category && category.trim() ? category.trim() : 'General';
    const taskDate = task_date || new Date().toISOString().split('T')[0];

    let assignedUser = currentUser.username;
    if (currentUser.role === 'admin' && target_user) {
      assignedUser = target_user;
    }

    const sql = `
      INSERT INTO public.user_tasks (
        user_id,
        title,
        status,
        priority,
        category,
        task_date,
        completed_at,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING 
        id, 
        user_id, 
        title, 
        status, 
        priority, 
        category, 
        TO_CHAR(task_date, 'YYYY-MM-DD') as task_date, 
        completed_at, 
        notes, 
        created_at, 
        updated_at
    `;

    const completedAt = taskStatus === 'done' ? new Date().toISOString() : null;
    const res = await query<UserTask>(sql, [
      assignedUser,
      title.trim(),
      taskStatus,
      taskPriority,
      taskCategory,
      taskDate,
      completedAt,
      notes && notes.trim() ? notes.trim() : null,
    ]);

    return NextResponse.json({ task: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, title, priority, category, task_date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task exists and permission
    let checkSql = 'SELECT * FROM public.user_tasks WHERE id = $1';
    const checkParams: any[] = [id];
    if (currentUser.role !== 'admin') {
      checkSql += ' AND user_id = $2';
      checkParams.push(currentUser.username);
    }

    const existingRes = await query(checkSql, checkParams);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const existingTask = existingRes.rows[0];

    // Build update dynamic fields
    const updates: string[] = [];
    const updateParams: any[] = [id];

    if (title !== undefined && title.trim()) {
      updateParams.push(title.trim());
      updates.push(`title = $${updateParams.length}`);
    }

    if (priority !== undefined && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      updateParams.push(priority);
      updates.push(`priority = $${updateParams.length}`);
    }

    if (category !== undefined && category.trim()) {
      updateParams.push(category.trim());
      updates.push(`category = $${updateParams.length}`);
    }

    if (task_date !== undefined && task_date) {
      updateParams.push(task_date);
      updates.push(`task_date = $${updateParams.length}`);
    }

    if (notes !== undefined) {
      updateParams.push(notes && notes.trim() ? notes.trim() : null);
      updates.push(`notes = $${updateParams.length}`);
    }

    if (status !== undefined && (status === 'todo' || status === 'done')) {
      updateParams.push(status);
      updates.push(`status = $${updateParams.length}`);

      if (status === 'done' && existingTask.status !== 'done') {
        updates.push(`completed_at = NOW()`);
      } else if (status === 'todo' && existingTask.status === 'done') {
        updates.push(`completed_at = NULL`);
      }
    }

    updates.push(`updated_at = NOW()`);

    const updateSql = `
      UPDATE public.user_tasks
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING 
        id, 
        user_id, 
        title, 
        status, 
        priority, 
        category, 
        TO_CHAR(task_date, 'YYYY-MM-DD') as task_date, 
        completed_at, 
        notes, 
        created_at, 
        updated_at
    `;

    const res = await query<UserTask>(updateSql, updateParams);
    return NextResponse.json({ task: res.rows[0] });
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  try {
    let sql = 'DELETE FROM public.user_tasks WHERE id = $1';
    const params: any[] = [id];

    if (currentUser.role !== 'admin') {
      sql += ' AND user_id = $2';
      params.push(currentUser.username);
    }

    const res = await query(sql, params);
    return NextResponse.json({ success: true, deleted: res.rowCount });
  } catch (error: any) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
