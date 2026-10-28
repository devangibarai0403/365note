import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM
  const paymentMode = searchParams.get('payment_mode'); // 'cod' | 'upi'

  try {
    let sql = `SELECT * FROM public.resin_expenses WHERE 1=1`;
    const params: any[] = [];
    let pIdx = 1;

    if (month) {
      sql += ` AND TO_CHAR(expense_date, 'YYYY-MM') = $${pIdx++}`;
      params.push(month);
    }

    if (paymentMode && paymentMode !== 'all') {
      sql += ` AND payment_mode = $${pIdx++}`;
      params.push(paymentMode);
    }

    sql += ` ORDER BY expense_date DESC, created_at DESC`;

    const res = await query(sql, params);

    // Summary stats
    const statsRes = await query<{
      total_expense: string;
      expense_cod: string;
      expense_upi: string;
      count: string;
    }>(
      `SELECT
        COALESCE(SUM(amount), 0)::text AS total_expense,
        COALESCE(SUM(CASE WHEN payment_mode = 'cod' THEN amount ELSE 0 END), 0)::text AS expense_cod,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN amount ELSE 0 END), 0)::text AS expense_upi,
        COUNT(*)::text AS count
       FROM public.resin_expenses`
    );

    return NextResponse.json({
      expenses: res.rows,
      stats: {
        total_expense: Number(statsRes.rows[0]?.total_expense || 0),
        expense_cod: Number(statsRes.rows[0]?.expense_cod || 0),
        expense_upi: Number(statsRes.rows[0]?.expense_upi || 0),
        count: Number(statsRes.rows[0]?.count || 0),
      },
    });
  } catch (error: any) {
    console.error('Fetch resin expenses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { spent_on, amount, payment_mode, expense_date, notes } = body;

    if (!spent_on || amount === undefined) {
      return NextResponse.json(
        { error: 'Where spent (spent_on) and amount are required' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a valid positive number' }, { status: 400 });
    }

    const validPaymentMode = payment_mode === 'cod' ? 'cod' : 'upi';
    const expenseDateVal = expense_date || new Date().toISOString().split('T')[0];

    const insertRes = await query(
      `INSERT INTO public.resin_expenses 
        (spent_on, amount, payment_mode, expense_date, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        spent_on.trim(),
        numericAmount,
        validPaymentMode,
        expenseDateVal,
        notes || null,
        user.username || 'devangi',
      ]
    );

    return NextResponse.json({
      success: true,
      expense: insertRes.rows[0],
      message: 'Resin expense recorded successfully',
    });
  } catch (error: any) {
    console.error('Create resin expense error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, spent_on, amount, payment_mode, expense_date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (spent_on !== undefined) {
      updates.push(`spent_on = $${pIdx++}`);
      params.push(spent_on.trim());
    }

    if (amount !== undefined) {
      updates.push(`amount = $${pIdx++}`);
      params.push(Number(amount));
    }

    if (payment_mode !== undefined) {
      updates.push(`payment_mode = $${pIdx++}`);
      params.push(payment_mode === 'cod' ? 'cod' : 'upi');
    }

    if (expense_date !== undefined) {
      updates.push(`expense_date = $${pIdx++}`);
      params.push(expense_date);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${pIdx++}`);
      params.push(notes);
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const sql = `UPDATE public.resin_expenses SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;

    const res = await query(sql, params);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      expense: res.rows[0],
      message: 'Expense updated successfully',
    });
  } catch (error: any) {
    console.error('Update resin expense error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const res = await query(`DELETE FROM public.resin_expenses WHERE id = $1 RETURNING *`, [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Resin expense deleted',
    });
  } catch (error: any) {
    console.error('Delete resin expense error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
