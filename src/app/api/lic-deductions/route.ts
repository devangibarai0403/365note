import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.lic_deductions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(50) NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      deduction_day INTEGER NOT NULL DEFAULT 1,
      label VARCHAR(255) NOT NULL DEFAULT 'LIC Premium',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_processed_month VARCHAR(7),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, []);
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserParam = searchParams.get('user_id');
  const targetUser = (user.role === 'admin' && targetUserParam ? targetUserParam : user.username).toLowerCase();

  if (targetUser !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Not applicable' }, { status: 403 });
  }

  try {
    await ensureTable();
    const res = await query<{
      id: string;
      user_id: string;
      amount: string | number;
      deduction_day: number;
      label: string;
      is_active: boolean;
      last_processed_month: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, user_id, amount, deduction_day, label, is_active, last_processed_month, created_at, updated_at
       FROM public.lic_deductions
       WHERE LOWER(user_id) = $1
       ORDER BY created_at ASC`,
      [targetUser]
    );
    return NextResponse.json({ deductions: res.rows });
  } catch (error: any) {
    console.error('Fetch LIC deductions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Not applicable' }, { status: 403 });
  }

  try {
    await ensureTable();
    const { id, amount, deduction_day, label, is_active, for_user } = await req.json();
    const targetUser = (user.role === 'admin' && for_user ? for_user : user.username).toLowerCase();

    if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }
    if (!deduction_day || isNaN(Number(deduction_day)) || Number(deduction_day) < 1 || Number(deduction_day) > 28) {
      return NextResponse.json({ error: 'Deduction day must be between 1 and 28' }, { status: 400 });
    }

    const finalLabel = label?.trim() || 'LIC Premium';
    const finalIsActive = is_active !== undefined ? Boolean(is_active) : true;

    if (id) {
      const res = await query(
        `UPDATE public.lic_deductions
         SET amount = $1, deduction_day = $2, label = $3, is_active = $4, updated_at = NOW()
         WHERE id = $5 AND LOWER(user_id) = $6
         RETURNING *`,
        [Number(amount), Number(deduction_day), finalLabel, finalIsActive, id, targetUser]
      );
      if (res.rows.length === 0) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      return NextResponse.json({ deduction: res.rows[0] });
    } else {
      const res = await query(
        `INSERT INTO public.lic_deductions (user_id, amount, deduction_day, label, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [targetUser, Number(amount), Number(deduction_day), finalLabel, finalIsActive]
      );
      return NextResponse.json({ deduction: res.rows[0] }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Save LIC deduction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  try {
    await ensureTable();
    if (user.role === 'admin') {
      await query('DELETE FROM public.lic_deductions WHERE id = $1', [id]);
    } else {
      await query('DELETE FROM public.lic_deductions WHERE id = $1 AND LOWER(user_id) = $2', [id, user.username.toLowerCase()]);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete LIC deduction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
