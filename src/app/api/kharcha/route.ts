import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { DailyKharcha } from '@/types';
import { getMonthDateRange } from '@/lib/time-utils';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM
  const date = searchParams.get('date');
  const targetUser = searchParams.get('user_id'); // Admin can filter by user
  const paymentMode = searchParams.get('payment_mode');

  try {
    let sql = `
      SELECT 
        id, 
        user_id, 
        TO_CHAR(expense_date, 'YYYY-MM-DD') as expense_date, 
        amount, 
        spent_on, 
        payment_mode, 
        category, 
        created_at
      FROM public.daily_kharcha
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based isolation
    if (user.role === 'admin') {
      if (targetUser) {
        params.push(targetUser.toLowerCase());
        sql += ` AND LOWER(user_id) = $${params.length}`;
      }
    } else {
      // Non-admins only see their own expenses
      params.push(user.username.toLowerCase());
      sql += ` AND LOWER(user_id) = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND expense_date = $${params.length}`;
    } else if (month) {
      const { startDate, endDate } = getMonthDateRange(month);
      params.push(startDate);
      params.push(endDate);
      sql += ` AND expense_date >= $${params.length - 1} AND expense_date <= $${params.length}`;
    }

    if (paymentMode && (paymentMode === 'Cash' || paymentMode === 'Online')) {
      params.push(paymentMode);
      sql += ` AND payment_mode = $${params.length}`;
    }

    sql += ' ORDER BY expense_date DESC, created_at DESC';

    const res = await query<DailyKharcha>(sql, params);

    // Compute metrics
    let totalExpense = 0;
    let cashExpense = 0;
    let onlineExpense = 0;

    res.rows.forEach(r => {
      const amt = Number(r.amount || 0);
      totalExpense += amt;
      if (r.payment_mode === 'Cash') cashExpense += amt;
      if (r.payment_mode === 'Online') onlineExpense += amt;
    });

    return NextResponse.json({
      expenses: res.rows,
      summary: {
        totalExpense: Math.round(totalExpense * 100) / 100,
        cashExpense: Math.round(cashExpense * 100) / 100,
        onlineExpense: Math.round(onlineExpense * 100) / 100,
        count: res.rows.length,
      },
    });
  } catch (error: any) {
    console.error('Fetch kharcha error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { amount, spent_on, payment_mode, expense_date, category, for_user } = await req.json();

    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid expense amount is required (min ₹1)' }, { status: 400 });
    }

    if (!spent_on || !spent_on.trim()) {
      return NextResponse.json({ error: 'What the money was spent on is required' }, { status: 400 });
    }

    if (!payment_mode || !['Cash', 'Online'].includes(payment_mode)) {
      return NextResponse.json({ error: 'Payment mode must be Cash or Online' }, { status: 400 });
    }

    const assignedUser = user.role === 'admin' && for_user ? for_user.toLowerCase() : user.username;
    const finalDate = expense_date || new Date().toISOString().split('T')[0];

    const res = await query<DailyKharcha>(
      `INSERT INTO public.daily_kharcha 
        (user_id, expense_date, amount, spent_on, payment_mode, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING 
         id, user_id, TO_CHAR(expense_date, 'YYYY-MM-DD') as expense_date, 
         amount, spent_on, payment_mode, category, created_at`,
      [
        assignedUser,
        finalDate,
        Number(amount),
        spent_on.trim(),
        payment_mode,
        category || 'General',
      ]
    );

    return NextResponse.json({ expense: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Create kharcha error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
  }

  try {
    if (user.role === 'admin') {
      await query('DELETE FROM public.daily_kharcha WHERE id = $1', [id]);
    } else {
      await query('DELETE FROM public.daily_kharcha WHERE id = $1 AND user_id = $2', [
        id,
        user.username,
      ]);
    }

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Delete kharcha error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
