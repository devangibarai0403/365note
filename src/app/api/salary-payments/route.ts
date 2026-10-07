import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SalaryPayment } from '@/types';

// Helper to calculate leave deductions for a given school/office and month
async function calculateMonthNetSalary(
  type: 'school' | 'office',
  targetId: string | null,
  month: string,
  baseSalary: number,
  paidLeavesDays: number,
  perLeaveCut: number
): Promise<{ leavesTaken: number; unpaidLeaves: number; leaveDeduction: number; netSalary: number }> {
  let leavesTaken = 0;
  let halfDays = 0;

  if (type === 'school' && targetId) {
    const statusRes = await query<{ status: string }>(
      `SELECT status FROM public.school_daily_status 
       WHERE school_id = $1 AND TO_CHAR(status_date, 'YYYY-MM') = $2`,
      [targetId, month]
    );
    statusRes.rows.forEach(r => {
      if (r.status === 'leave_taken') leavesTaken++;
      else if (r.status === 'half_day') halfDays++;
    });
  } else if (type === 'office') {
    const statusRes = await query<{ status: string }>(
      `SELECT status FROM public.office_daily_status 
       WHERE TO_CHAR(status_date, 'YYYY-MM') = $1`,
      [month]
    );
    statusRes.rows.forEach(r => {
      if (r.status === 'leave_taken') leavesTaken++;
      else if (r.status === 'half_day') halfDays++;
    });
  }

  const effectiveLeaves = leavesTaken + halfDays * 0.5;
  const unpaidLeaves = Math.max(0, effectiveLeaves - paidLeavesDays);
  const cutRate = perLeaveCut > 0 ? perLeaveCut : (baseSalary > 0 ? Math.round(baseSalary / 30) : 0);
  const leaveDeduction = Math.round(unpaidLeaves * cutRate);
  const netSalary = Math.max(0, baseSalary - leaveDeduction);

  return { leavesTaken: effectiveLeaves, unpaidLeaves, leaveDeduction, netSalary };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') || 'school') as 'school' | 'office';
  const month = searchParams.get('month'); // YYYY-MM
  const schoolId = searchParams.get('school_id');

  if (!month) {
    return NextResponse.json({ error: 'Month parameter (YYYY-MM) is required' }, { status: 400 });
  }

  // Access validation
  if (user.role === 'shrikesh' && type === 'school') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === 'devangi' && type === 'office') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetUser = type === 'school' ? 'devangi' : 'shrikesh';

  try {
    // 1. Fetch organization salary policy
    let baseSalary = 0;
    let paidLeavesDays = 0;
    let perLeaveCut = 0;
    let resolvedSchoolId: string | null = null;
    let sourceName = '';

    if (type === 'school') {
      let schoolRes;
      if (schoolId) {
        schoolRes = await query<{ id: string; name: string; monthly_salary: number; paid_leaves_days: number; per_leave_cut: number }>(
          `SELECT id, name, monthly_salary, paid_leaves_days, per_leave_cut FROM public.schools WHERE id = $1`,
          [schoolId]
        );
      } else {
        schoolRes = await query<{ id: string; name: string; monthly_salary: number; paid_leaves_days: number; per_leave_cut: number }>(
          `SELECT id, name, monthly_salary, paid_leaves_days, per_leave_cut FROM public.schools ORDER BY created_at ASC LIMIT 1`
        );
      }

      if (schoolRes.rows.length > 0) {
        resolvedSchoolId = schoolRes.rows[0].id;
        sourceName = schoolRes.rows[0].name;
        baseSalary = Number(schoolRes.rows[0].monthly_salary || 0);
        paidLeavesDays = Number(schoolRes.rows[0].paid_leaves_days || 0);
        perLeaveCut = Number(schoolRes.rows[0].per_leave_cut || 0);
      }
    } else {
      const officeRes = await query<{ id: string; company_name: string; monthly_salary: number; paid_leaves_days: number; per_leave_cut: number }>(
        `SELECT id, company_name, monthly_salary, paid_leaves_days, per_leave_cut FROM public.office LIMIT 1`
      );
      if (officeRes.rows.length > 0) {
        sourceName = officeRes.rows[0].company_name;
        baseSalary = Number(officeRes.rows[0].monthly_salary || 0);
        paidLeavesDays = Number(officeRes.rows[0].paid_leaves_days || 0);
        perLeaveCut = Number(officeRes.rows[0].per_leave_cut || 0);
      }
    }

    // 2. Calculate current month's attendance & net salary
    const currentMonthCalc = await calculateMonthNetSalary(
      type,
      resolvedSchoolId,
      month,
      baseSalary,
      paidLeavesDays,
      perLeaveCut
    );

    // 3. Calculate previous months carry-forward balance
    // Find all active prior months (with recorded attendance or salary payments)
    let priorMonthsSql = '';
    const priorParams: any[] = [month];

    if (type === 'school' && resolvedSchoolId) {
      priorParams.push(resolvedSchoolId);
      priorMonthsSql = `
        SELECT DISTINCT TO_CHAR(status_date, 'YYYY-MM') as month_str
        FROM public.school_daily_status
        WHERE school_id = $2 AND TO_CHAR(status_date, 'YYYY-MM') < $1
        UNION
        SELECT DISTINCT month as month_str
        FROM public.salary_payments
        WHERE type = 'school' AND school_id = $2 AND month < $1
        ORDER BY month_str ASC
      `;
    } else {
      priorMonthsSql = `
        SELECT DISTINCT TO_CHAR(status_date, 'YYYY-MM') as month_str
        FROM public.office_daily_status
        WHERE TO_CHAR(status_date, 'YYYY-MM') < $1
        UNION
        SELECT DISTINCT month as month_str
        FROM public.salary_payments
        WHERE type = 'office' AND month < $1
        ORDER BY month_str ASC
      `;
    }

    const priorMonthsRes = await query<{ month_str: string }>(priorMonthsSql, priorParams);

    let carriedBalance = 0;
    for (const row of priorMonthsRes.rows) {
      const pMonth = row.month_str;
      // Net salary for that prior month
      const pCalc = await calculateMonthNetSalary(type, resolvedSchoolId, pMonth, baseSalary, paidLeavesDays, perLeaveCut);
      const pTotalReceivable = pCalc.netSalary + carriedBalance;

      // Payments received for that prior month
      const pPaySql = type === 'school' && resolvedSchoolId
        ? `SELECT COALESCE(SUM(amount), 0) as total FROM public.salary_payments WHERE type = 'school' AND school_id = $1 AND month = $2`
        : `SELECT COALESCE(SUM(amount), 0) as total FROM public.salary_payments WHERE type = 'office' AND month = $1`;
      const pPayParams = type === 'school' && resolvedSchoolId ? [resolvedSchoolId, pMonth] : [pMonth];

      const pPayRes = await query<{ total: string | number }>(pPaySql, pPayParams);
      const pReceived = Number(pPayRes.rows[0]?.total || 0);

      carriedBalance = Math.round((pTotalReceivable - pReceived) * 100) / 100;
    }

    const previousBalance = carriedBalance;
    const totalReceivable = Math.round((currentMonthCalc.netSalary + previousBalance) * 100) / 100;

    // 4. Fetch current month's payments
    let payQuery = `
      SELECT id, user_id, type, school_id, office_id, source_name, month, amount, payment_mode, 
             TO_CHAR(payment_date, 'YYYY-MM-DD') as payment_date, notes, created_at, updated_at
      FROM public.salary_payments
      WHERE type = $1 AND month = $2
    `;
    const payQueryParams: any[] = [type, month];

    if (type === 'school' && resolvedSchoolId) {
      payQueryParams.push(resolvedSchoolId);
      payQuery += ` AND school_id = $${payQueryParams.length}`;
    }

    payQuery += ' ORDER BY payment_date ASC, created_at ASC';
    const paymentsRes = await query<SalaryPayment>(payQuery, payQueryParams);

    const totalReceived = paymentsRes.rows.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balanceRemaining = Math.round((totalReceivable - totalReceived) * 100) / 100;

    return NextResponse.json({
      summary: {
        month,
        source_name: sourceName,
        base_salary: baseSalary,
        leaves_taken: currentMonthCalc.leavesTaken,
        paid_leaves_days: paidLeavesDays,
        unpaid_leaves: currentMonthCalc.unpaidLeaves,
        leave_deduction: currentMonthCalc.leaveDeduction,
        net_estimated_salary: currentMonthCalc.netSalary,
        previous_balance: previousBalance,
        total_receivable: totalReceivable,
        total_received: totalReceived,
        balance_remaining: balanceRemaining,
        is_balanced: Math.abs(balanceRemaining) < 0.01,
        payments: paymentsRes.rows,
      }
    });
  } catch (error: any) {
    console.error('Fetch salary payments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, school_id, office_id, month, amount, payment_mode, payment_date, notes } = body;

    if (!type || !month || !amount) {
      return NextResponse.json({ error: 'Type, month, and amount are required' }, { status: 400 });
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (user.role === 'shrikesh' && type === 'school') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (user.role === 'devangi' && type === 'office') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = type === 'school' ? 'devangi' : 'shrikesh';

    // Get source name
    let sourceName = 'Salary';
    if (type === 'school' && school_id) {
      const s = await query<{ name: string }>(`SELECT name FROM public.schools WHERE id = $1`, [school_id]);
      if (s.rows.length > 0) sourceName = s.rows[0].name;
    } else if (type === 'office') {
      const o = await query<{ company_name: string }>(`SELECT company_name FROM public.office LIMIT 1`);
      if (o.rows.length > 0) sourceName = o.rows[0].company_name;
    }

    const res = await query<SalaryPayment>(
      `INSERT INTO public.salary_payments 
        (user_id, type, school_id, office_id, source_name, month, amount, payment_mode, payment_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, type, school_id, office_id, source_name, month, amount, payment_mode, 
                 TO_CHAR(payment_date, 'YYYY-MM-DD') as payment_date, notes, created_at, updated_at`,
      [
        targetUser,
        type,
        school_id || null,
        office_id || null,
        sourceName,
        month,
        amtNum,
        payment_mode || 'Online',
        payment_date || new Date().toISOString().split('T')[0],
        notes || null,
      ]
    );

    return NextResponse.json({
      success: true,
      payment: res.rows[0],
    });
  } catch (error: any) {
    console.error('Record salary payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, amount, payment_mode, payment_date, notes } = body;

    if (!id || !amount) {
      return NextResponse.json({ error: 'ID and amount are required' }, { status: 400 });
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    const res = await query<SalaryPayment>(
      `UPDATE public.salary_payments
       SET amount = $1, payment_mode = $2, payment_date = $3, notes = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, user_id, type, school_id, office_id, source_name, month, amount, payment_mode, 
                 TO_CHAR(payment_date, 'YYYY-MM-DD') as payment_date, notes, created_at, updated_at`,
      [
        amtNum,
        payment_mode || 'Online',
        payment_date || new Date().toISOString().split('T')[0],
        notes || null,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: res.rows[0],
    });
  } catch (error: any) {
    console.error('Update salary payment error:', error);
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
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }

  try {
    const res = await query(`DELETE FROM public.salary_payments WHERE id = $1 RETURNING id`, [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Payment deleted' });
  } catch (error: any) {
    console.error('Delete salary payment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
