import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getMonthDateRange } from '@/lib/time-utils';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  const month = searchParams.get('month') || currentMonthStr;
  const { startDate: monthStart, endDate: monthEnd } = getMonthDateRange(month);

  try {
    // 1. Classes Stats (for Devangi & Admin)
    let classesStats = {
      todayClasses: 0,
      todayHours: 0,
      todayEarnings: 0,
      monthClasses: 0,
      monthHours: 0,
      monthEarnings: 0,
      allTimeEarnings: 0,
      allTimeHours: 0,
      classWiseMonth: [] as any[],
    };

    if (user.role === 'admin' || user.role === 'devangi') {
      const todayClassesRes = await query<{ count: string; hours: string; total: string }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(hours), 0) as hours, COALESCE(SUM(total_amount), 0) as total 
         FROM public.class_records 
         WHERE record_date = $1`,
        [todayStr]
      );

      const isAll = month === 'all';
      const monthClassesRes = isAll
        ? await query<{ count: string; hours: string; total: string }>(
            `SELECT COUNT(*) as count, COALESCE(SUM(hours), 0) as hours, COALESCE(SUM(total_amount), 0) as total 
             FROM public.class_records`
          )
        : await query<{ count: string; hours: string; total: string }>(
            `SELECT COUNT(*) as count, COALESCE(SUM(hours), 0) as hours, COALESCE(SUM(total_amount), 0) as total 
             FROM public.class_records 
             WHERE record_date >= $1 AND record_date <= $2`,
            [monthStart, monthEnd]
          );

      const allTimeRes = await query<{ hours: string; total: string }>(
        `SELECT COALESCE(SUM(hours), 0) as hours, COALESCE(SUM(total_amount), 0) as total 
         FROM public.class_records`
      );

      const classWiseRes = isAll
        ? await query<{ class_name: string; total_hours: string; total_amount: string }>(
            `SELECT class_name, SUM(hours) as total_hours, SUM(total_amount) as total_amount 
             FROM public.class_records 
             GROUP BY class_name 
             ORDER BY total_amount DESC`
          )
        : await query<{ class_name: string; total_hours: string; total_amount: string }>(
            `SELECT class_name, SUM(hours) as total_hours, SUM(total_amount) as total_amount 
             FROM public.class_records 
             WHERE record_date >= $1 AND record_date <= $2 
             GROUP BY class_name 
             ORDER BY total_amount DESC`,
            [monthStart, monthEnd]
          );

      classesStats = {
        todayClasses: parseInt(todayClassesRes.rows[0]?.count || '0'),
        todayHours: parseFloat(todayClassesRes.rows[0]?.hours || '0'),
        todayEarnings: parseFloat(todayClassesRes.rows[0]?.total || '0'),
        monthClasses: parseInt(monthClassesRes.rows[0]?.count || '0'),
        monthHours: parseFloat(monthClassesRes.rows[0]?.hours || '0'),
        monthEarnings: parseFloat(monthClassesRes.rows[0]?.total || '0'),
        allTimeEarnings: parseFloat(allTimeRes.rows[0]?.total || '0'),
        allTimeHours: parseFloat(allTimeRes.rows[0]?.hours || '0'),
        classWiseMonth: classWiseRes.rows.map(r => ({
          name: r.class_name,
          hours: Number(r.total_hours),
          earnings: Number(r.total_amount),
        })),
      };
    }

    // 2. School Stats (for Devangi & Admin)
    let schoolStats = {
      totalSchools: 0,
      workingDays: 0,
      leaveBySchool: 0,
      leaveTaken: 0,
    };

    if (user.role === 'admin' || user.role === 'devangi') {
      const schoolsCountRes = await query('SELECT COUNT(*) as count FROM public.schools WHERE is_active = TRUE');
      const schoolAttendanceRes = await query<{ status: string; count: string }>(
        `SELECT status, COUNT(*) as count 
         FROM public.school_daily_status 
         WHERE status_date >= $1 AND status_date <= $2 
         GROUP BY status`,
        [monthStart, monthEnd]
      );

      let working = 0;
      let bySchool = 0;
      let taken = 0;

      schoolAttendanceRes.rows.forEach(r => {
        if (r.status === 'working') working = parseInt(r.count);
        if (r.status === 'leave_by_school') bySchool = parseInt(r.count);
        if (r.status === 'leave_taken') taken = parseInt(r.count);
      });

      schoolStats = {
        totalSchools: parseInt(schoolsCountRes.rows[0]?.count || '0'),
        workingDays: working,
        leaveBySchool: bySchool,
        leaveTaken: taken,
      };
    }

    // 3. Office Stats (for Shrikesh & Admin)
    let officeStats = {
      workingDays: 0,
      leaveByOffice: 0,
      leaveTaken: 0,
    };

    if (user.role === 'admin' || user.role === 'shrikesh') {
      const officeAttendanceRes = await query<{ status: string; count: string }>(
        `SELECT status, COUNT(*) as count 
         FROM public.office_daily_status 
         WHERE status_date >= $1 AND status_date <= $2 
         GROUP BY status`,
        [monthStart, monthEnd]
      );

      let working = 0;
      let byOffice = 0;
      let taken = 0;

      officeAttendanceRes.rows.forEach(r => {
        if (r.status === 'working') working = parseInt(r.count);
        if (r.status === 'leave_by_office') byOffice = parseInt(r.count);
        if (r.status === 'leave_taken') taken = parseInt(r.count);
      });

      officeStats = {
        workingDays: working,
        leaveByOffice: byOffice,
        leaveTaken: taken,
      };
    }

    // 4. Daily Kharcha Stats
    // If admin: calculate for devangi, shrikesh, and combined
    // If devangi or shrikesh: calculate only for self
    let kharchaStats: any = {};

    if (user.role === 'admin') {
      const getKharchaFor = async (targetUser?: string) => {
        const userFilter = targetUser ? `AND LOWER(user_id) = '${targetUser}'` : '';
        const todayRes = await query<{ total: string }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM public.daily_kharcha WHERE expense_date = $1 ${userFilter}`,
          [todayStr]
        );
        const monthRes = await query<{ total: string; cash: string; online: string }>(
          `SELECT 
            COALESCE(SUM(amount), 0) as total,
            COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cash,
            COALESCE(SUM(CASE WHEN payment_mode = 'Online' THEN amount ELSE 0 END), 0) as online
           FROM public.daily_kharcha 
           WHERE expense_date >= $1 AND expense_date <= $2 ${userFilter}`,
          [monthStart, monthEnd]
        );
        const allTimeRes = await query<{ total: string }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM public.daily_kharcha WHERE 1=1 ${userFilter}`
        );

        return {
          todayExpense: parseFloat(todayRes.rows[0]?.total || '0'),
          monthExpense: parseFloat(monthRes.rows[0]?.total || '0'),
          cashExpense: parseFloat(monthRes.rows[0]?.cash || '0'),
          onlineExpense: parseFloat(monthRes.rows[0]?.online || '0'),
          totalExpense: parseFloat(allTimeRes.rows[0]?.total || '0'),
        };
      };

      kharchaStats = {
        combined: await getKharchaFor(),
        devangi: await getKharchaFor('devangi'),
        shrikesh: await getKharchaFor('shrikesh'),
      };
    } else {
      const todayRes = await query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM public.daily_kharcha WHERE expense_date = $1 AND LOWER(user_id) = $2`,
        [todayStr, user.username]
      );
      const monthRes = await query<{ total: string; cash: string; online: string }>(
        `SELECT 
          COALESCE(SUM(amount), 0) as total,
          COALESCE(SUM(CASE WHEN payment_mode = 'Cash' THEN amount ELSE 0 END), 0) as cash,
          COALESCE(SUM(CASE WHEN payment_mode = 'Online' THEN amount ELSE 0 END), 0) as online
         FROM public.daily_kharcha 
         WHERE expense_date >= $1 AND expense_date <= $2 AND LOWER(user_id) = $3`,
        [monthStart, monthEnd, user.username]
      );
      const allTimeRes = await query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM public.daily_kharcha WHERE LOWER(user_id) = $1`,
        [user.username]
      );

      kharchaStats = {
        todayExpense: parseFloat(todayRes.rows[0]?.total || '0'),
        monthExpense: parseFloat(monthRes.rows[0]?.total || '0'),
        cashExpense: parseFloat(monthRes.rows[0]?.cash || '0'),
        onlineExpense: parseFloat(monthRes.rows[0]?.online || '0'),
        totalExpense: parseFloat(allTimeRes.rows[0]?.total || '0'),
      };
    }

    // 5. Family Money Stats
    let familyMoneyStats: any = {};

    if (user.role === 'admin') {
      const getFamilyFor = async (targetUser: string) => {
        const res = await query<{
          received: string;
          sent: string;
          papa_received: string;
          papa_sent: string;
        }>(
          `SELECT 
            COALESCE(SUM(CASE WHEN transaction_type = 'received' THEN amount ELSE 0 END), 0) as received,
            COALESCE(SUM(CASE WHEN transaction_type = 'sent' THEN amount ELSE 0 END), 0) as sent,
            COALESCE(SUM(CASE WHEN transaction_type = 'received' AND LOWER(person_name) = 'papa' THEN amount ELSE 0 END), 0) as papa_received,
            COALESCE(SUM(CASE WHEN transaction_type = 'sent' AND LOWER(person_name) = 'papa' THEN amount ELSE 0 END), 0) as papa_sent
           FROM public.family_money
           WHERE transaction_date >= $1 AND transaction_date <= $2 AND LOWER(user_id) = $3`,
          [monthStart, monthEnd, targetUser]
        );

        const r = res.rows[0];
        return {
          received: parseFloat(r?.received || '0'),
          sent: parseFloat(r?.sent || '0'),
          papaReceived: parseFloat(r?.papa_received || '0'),
          papaSent: parseFloat(r?.papa_sent || '0'),
        };
      };

      familyMoneyStats = {
        devangi: await getFamilyFor('devangi'),
        shrikesh: await getFamilyFor('shrikesh'),
      };
    } else {
      const res = await query<{
        received: string;
        sent: string;
        papa_received: string;
        papa_sent: string;
      }>(
        `SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'received' THEN amount ELSE 0 END), 0) as received,
          COALESCE(SUM(CASE WHEN transaction_type = 'sent' THEN amount ELSE 0 END), 0) as sent,
          COALESCE(SUM(CASE WHEN transaction_type = 'received' AND LOWER(person_name) = 'papa' THEN amount ELSE 0 END), 0) as papa_received,
          COALESCE(SUM(CASE WHEN transaction_type = 'sent' AND LOWER(person_name) = 'papa' THEN amount ELSE 0 END), 0) as papa_sent
         FROM public.family_money
         WHERE transaction_date >= $1 AND transaction_date <= $2 AND LOWER(user_id) = $3`,
        [monthStart, monthEnd, user.username]
      );

      const r = res.rows[0];
      familyMoneyStats = {
        received: parseFloat(r?.received || '0'),
        sent: parseFloat(r?.sent || '0'),
        papaReceived: parseFloat(r?.papa_received || '0'),
        papaSent: parseFloat(r?.papa_sent || '0'),
      };
    }

    // 6. Resin Studio Budgeting Stats (for Devangi & Admin)
    let resinStats = {
      totalRevenue: 0,
      paidCod: 0,
      paidUpi: 0,
      totalExpenses: 0,
      expenseCod: 0,
      expenseUpi: 0,
      netProfit: 0,
      totalOrders: 0,
      paidOrders: 0,
      unpaidOrders: 0,
      pendingAmount: 0,
      monthRevenue: 0,
      monthExpenses: 0,
    };

    if (user.role === 'admin' || user.role === 'devangi') {
      try {
        const orderSummaryRes = await query<{
          total_revenue: string;
          paid_cod: string;
          paid_upi: string;
          total_orders: string;
          paid_orders: string;
          unpaid_orders: string;
          pending_amount: string;
        }>(
          `SELECT
            COALESCE(SUM(CASE WHEN status = 'paid' THEN price ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN status = 'paid' AND payment_mode = 'cod' THEN price ELSE 0 END), 0) as paid_cod,
            COALESCE(SUM(CASE WHEN status = 'paid' AND payment_mode = 'upi' THEN price ELSE 0 END), 0) as paid_upi,
            COUNT(*) as total_orders,
            COUNT(*) FILTER (WHERE status = 'paid') as paid_orders,
            COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_orders,
            COALESCE(SUM(CASE WHEN status = 'unpaid' THEN price ELSE 0 END), 0) as pending_amount
           FROM public.resin_orders`
        );

        const expSummaryRes = await query<{
          total_expenses: string;
          expense_cod: string;
          expense_upi: string;
        }>(
          `SELECT
            COALESCE(SUM(amount), 0) as total_expenses,
            COALESCE(SUM(CASE WHEN payment_mode = 'cod' THEN amount ELSE 0 END), 0) as expense_cod,
            COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN amount ELSE 0 END), 0) as expense_upi
           FROM public.resin_expenses`
        );

        const monthOrderRes = await query<{ month_revenue: string }>(
          `SELECT COALESCE(SUM(price), 0) as month_revenue
           FROM public.resin_orders
           WHERE status = 'paid' AND order_date >= $1 AND order_date <= $2`,
          [monthStart, monthEnd]
        );

        const monthExpRes = await query<{ month_expenses: string }>(
          `SELECT COALESCE(SUM(amount), 0) as month_expenses
           FROM public.resin_expenses
           WHERE expense_date >= $1 AND expense_date <= $2`,
          [monthStart, monthEnd]
        );

        const ord = orderSummaryRes.rows[0];
        const exp = expSummaryRes.rows[0];

        const totalRev = parseFloat(ord?.total_revenue || '0');
        const totalExp = parseFloat(exp?.total_expenses || '0');

        resinStats = {
          totalRevenue: totalRev,
          paidCod: parseFloat(ord?.paid_cod || '0'),
          paidUpi: parseFloat(ord?.paid_upi || '0'),
          totalExpenses: totalExp,
          expenseCod: parseFloat(exp?.expense_cod || '0'),
          expenseUpi: parseFloat(exp?.expense_upi || '0'),
          netProfit: totalRev - totalExp,
          totalOrders: parseInt(ord?.total_orders || '0'),
          paidOrders: parseInt(ord?.paid_orders || '0'),
          unpaidOrders: parseInt(ord?.unpaid_orders || '0'),
          pendingAmount: parseFloat(ord?.pending_amount || '0'),
          monthRevenue: parseFloat(monthOrderRes.rows[0]?.month_revenue || '0'),
          monthExpenses: parseFloat(monthExpRes.rows[0]?.month_expenses || '0'),
        };
      } catch (err) {
        console.warn('Dashboard resin stats query error:', err);
      }
    }

    return NextResponse.json({
      role: user.role,
      username: user.username,
      month,
      today: todayStr,
      classes: classesStats,
      school: schoolStats,
      office: officeStats,
      kharcha: kharchaStats,
      familyMoney: familyMoneyStats,
      resin: resinStats,
    });
  } catch (error: any) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
