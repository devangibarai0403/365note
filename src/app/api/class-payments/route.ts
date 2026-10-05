import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ClassPayment, MonthlyClassPaymentSummary, PaymentMode } from '@/types';
import { getMonthDateRange } from '@/lib/time-utils';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden: Classes are only accessible to Devangi and Admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = searchParams.get('month') || currentMonthStr;
  const classNameParam = searchParams.get('class_name');

  try {
    const isAll = month === 'all';
    let monthStart = '';
    let monthEnd = '';
    if (!isAll) {
      const range = getMonthDateRange(month);
      monthStart = range.startDate;
      monthEnd = range.endDate;
    }

    // 1. Fetch all defined classes
    const classesRes = await query<{ id: string; name: string; is_active: boolean }>(
      'SELECT id, name, is_active FROM public.classes ORDER BY name ASC'
    );
    const classesMap = new Map<string, { id: string; name: string; is_active: boolean }>();
    classesRes.rows.forEach(c => classesMap.set(c.name, c));

    // 2. Fetch monthly class records grouped by class_name
    let recordsSql = `
      SELECT 
        class_name,
        COUNT(*) as sessions_count,
        COALESCE(SUM(hours), 0) as total_hours,
        COALESCE(SUM(total_amount), 0) as total_billed
      FROM public.class_records
      WHERE 1=1
    `;
    const recordParams: any[] = [];
    if (!isAll) {
      recordParams.push(monthStart, monthEnd);
      recordsSql += ` AND record_date >= $1 AND record_date <= $2`;
    }
    if (classNameParam) {
      recordParams.push(classNameParam);
      recordsSql += ` AND class_name = $${recordParams.length}`;
    }
    recordsSql += ` GROUP BY class_name`;

    const recordsRes = await query<{
      class_name: string;
      sessions_count: string | number;
      total_hours: string | number;
      total_billed: string | number;
    }>(recordsSql, recordParams);

    const recordsByClass = new Map<string, { sessions: number; hours: number; billed: number }>();
    recordsRes.rows.forEach(r => {
      recordsByClass.set(r.class_name, {
        sessions: parseInt(String(r.sessions_count || 0)),
        hours: Math.round(Number(r.total_hours || 0) * 100) / 100,
        billed: Math.round(Number(r.total_billed || 0) * 100) / 100,
      });
    });

    // 3. Fetch class payments for this month
    let paymentsSql = `
      SELECT 
        id,
        class_id,
        class_name,
        month,
        amount,
        payment_mode,
        TO_CHAR(payment_date, 'YYYY-MM-DD') as payment_date,
        notes,
        created_by,
        created_at,
        updated_at
      FROM public.class_payments
      WHERE 1=1
    `;
    const payParams: any[] = [];
    if (!isAll) {
      payParams.push(month);
      paymentsSql += ` AND month = $${payParams.length}`;
    }
    if (classNameParam) {
      payParams.push(classNameParam);
      paymentsSql += ` AND class_name = $${payParams.length}`;
    }
    paymentsSql += ` ORDER BY payment_date DESC, created_at DESC`;

    const payRes = await query<ClassPayment>(paymentsSql, payParams);
    const paymentsList = payRes.rows.map(p => ({
      ...p,
      amount: Number(p.amount),
    }));

    // Group payments by class_name
    const paymentsByClass = new Map<string, ClassPayment[]>();
    paymentsList.forEach(p => {
      if (!paymentsByClass.has(p.class_name)) {
        paymentsByClass.set(p.class_name, []);
      }
      paymentsByClass.get(p.class_name)!.push(p);
    });

    // 4. Combine all distinct class names (from defined classes, recorded sessions, and payments)
    const allClassNames = new Set<string>();
    classesMap.forEach((_, name) => allClassNames.add(name));
    recordsByClass.forEach((_, name) => allClassNames.add(name));
    paymentsByClass.forEach((_, name) => allClassNames.add(name));

    // If filtered by class_name, retain only that class
    const filteredClassNames = classNameParam
      ? Array.from(allClassNames).filter(n => n.toLowerCase() === classNameParam.toLowerCase())
      : Array.from(allClassNames);

    let totalBilledAll = 0;
    let totalPaidAll = 0;
    let totalCashPaidAll = 0;
    let totalOnlinePaidAll = 0;
    let totalBalanceDueAll = 0;
    let fullPaidCount = 0;
    let pendingCount = 0;

    const classesSummary: MonthlyClassPaymentSummary[] = [];

    filteredClassNames.sort((a, b) => a.localeCompare(b)).forEach(name => {
      const classDef = classesMap.get(name);
      const rec = recordsByClass.get(name) || { sessions: 0, hours: 0, billed: 0 };
      const pays = paymentsByClass.get(name) || [];

      const totalBilled = rec.billed;
      const totalPaid = pays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const cashPaid = pays
        .filter(p => p.payment_mode?.toLowerCase() === 'cash')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const onlinePaid = pays
        .filter(p => p.payment_mode?.toLowerCase() === 'online')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const balanceDue = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);

      let status: MonthlyClassPaymentSummary['status'] = 'no_classes';
      if (totalBilled === 0 && totalPaid === 0) {
        status = 'no_classes';
      } else if (totalBilled > 0 && totalPaid >= totalBilled) {
        status = 'full_paid';
        fullPaidCount++;
      } else if (totalPaid > 0 && totalPaid < totalBilled) {
        status = 'in_balance';
        pendingCount++;
      } else if (totalPaid === 0 && totalBilled > 0) {
        status = 'pending';
        pendingCount++;
      } else if (totalPaid > totalBilled) {
        status = 'overpaid';
        fullPaidCount++;
      }

      totalBilledAll += totalBilled;
      totalPaidAll += totalPaid;
      totalCashPaidAll += cashPaid;
      totalOnlinePaidAll += onlinePaid;
      totalBalanceDueAll += balanceDue;

      classesSummary.push({
        class_id: classDef?.id,
        class_name: name,
        month,
        monthly_records_count: rec.sessions,
        monthly_hours: rec.hours,
        total_billed: totalBilled,
        total_paid: Math.round(totalPaid * 100) / 100,
        cash_paid: Math.round(cashPaid * 100) / 100,
        online_paid: Math.round(onlinePaid * 100) / 100,
        balance_due: balanceDue,
        status,
        payments: pays,
      });
    });

    return NextResponse.json({
      month,
      classesSummary,
      payments: paymentsList,
      totals: {
        total_billed: Math.round(totalBilledAll * 100) / 100,
        total_paid: Math.round(totalPaidAll * 100) / 100,
        total_cash_paid: Math.round(totalCashPaidAll * 100) / 100,
        total_online_paid: Math.round(totalOnlinePaidAll * 100) / 100,
        total_balance_due: Math.round(totalBalanceDueAll * 100) / 100,
        full_paid_count: fullPaidCount,
        pending_count: pendingCount,
      },
    });
  } catch (error: any) {
    console.error('Fetch class payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { class_id, class_name, month, amount, payment_mode, payment_date, notes } = body;

    if (!class_name || !class_name.trim()) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Valid payment amount greater than 0 is required' }, { status: 400 });
    }

    const validMode: PaymentMode = (payment_mode === 'Cash' || payment_mode === 'cash') ? 'Cash' : 'Online';

    // Validate month format (YYYY-MM)
    const validMonth = month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const validDate = payment_date && /^\d{4}-\d{2}-\d{2}$/.test(payment_date)
      ? payment_date
      : new Date().toISOString().split('T')[0];

    // Find class_id if not supplied
    let targetClassId = class_id || null;
    if (!targetClassId) {
      const cls = await query<{ id: string }>('SELECT id FROM public.classes WHERE LOWER(name) = LOWER($1)', [class_name.trim()]);
      if (cls.rows.length > 0) {
        targetClassId = cls.rows[0].id;
      }
    }

    const insertRes = await query<ClassPayment>(
      `INSERT INTO public.class_payments 
        (class_id, class_name, month, amount, payment_mode, payment_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING 
         id, class_id, class_name, month, amount, payment_mode, 
         TO_CHAR(payment_date, 'YYYY-MM-DD') as payment_date, 
         notes, created_by, created_at, updated_at`,
      [
        targetClassId,
        class_name.trim(),
        validMonth,
        parsedAmount,
        validMode,
        validDate,
        notes?.trim() || null,
        'devangi', // Payments for individual classes directly credit Devangi's balance
      ]
    );

    return NextResponse.json({
      success: true,
      payment: {
        ...insertRes.rows[0],
        amount: Number(insertRes.rows[0].amount),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Record class payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, amount, payment_mode, payment_date, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const parsedAmount = amount !== undefined ? Number(amount) : null;
    if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      return NextResponse.json({ error: 'Valid payment amount greater than 0 is required' }, { status: 400 });
    }

    const validMode = payment_mode
      ? ((payment_mode === 'Cash' || payment_mode === 'cash') ? 'Cash' : 'Online')
      : null;

    const res = await query<ClassPayment>(
      `UPDATE public.class_payments
       SET amount = COALESCE($1, amount),
           payment_mode = COALESCE($2, payment_mode),
           payment_date = COALESCE($3, payment_date),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5
       RETURNING 
         id, class_id, class_name, month, amount, payment_mode, 
         TO_CHAR(payment_date, 'YYYY-MM-DD') as payment_date, 
         notes, created_by, created_at, updated_at`,
      [parsedAmount, validMode, payment_date || null, notes !== undefined ? notes : null, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        ...res.rows[0],
        amount: Number(res.rows[0].amount),
      },
    });
  } catch (error: any) {
    console.error('Update class payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }

  try {
    await query('DELETE FROM public.class_payments WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Class payment deleted successfully' });
  } catch (error: any) {
    console.error('Delete class payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
