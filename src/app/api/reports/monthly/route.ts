import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = searchParams.get('month') || currentMonth;
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  try {
    const reportData: any = {
      month,
      role: user.role,
      user: user.username,
    };

    // 1. Classes report (Devangi and Admin)
    if (user.role === 'admin' || user.role === 'devangi') {
      const classesRecords = await query(
        `SELECT 
          id, class_name, subject_name, TO_CHAR(record_date, 'YYYY-MM-DD') as record_date, 
          from_time, to_time, hours, hourly_rate, total_amount, notes, imported_from_excel
         FROM public.class_records
         WHERE record_date >= $1 AND record_date <= $2
         ORDER BY record_date ASC, created_at ASC`,
        [monthStart, monthEnd]
      );

      let totalClasses = classesRecords.rows.length;
      let totalHours = 0;
      let totalEarnings = 0;
      const classSummaryMap: Record<string, { count: number; hours: number; amount: number }> = {};

      classesRecords.rows.forEach(r => {
        const h = Number(r.hours || 0);
        const a = Number(r.total_amount || 0);
        totalHours += h;
        totalEarnings += a;

        if (!classSummaryMap[r.class_name]) {
          classSummaryMap[r.class_name] = { count: 0, hours: 0, amount: 0 };
        }
        classSummaryMap[r.class_name].count++;
        classSummaryMap[r.class_name].hours += h;
        classSummaryMap[r.class_name].amount += a;
      });

      reportData.classes = {
        totalClasses,
        totalHours: Math.round(totalHours * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        byClass: Object.entries(classSummaryMap).map(([name, data]) => ({
          name,
          count: data.count,
          hours: Math.round(data.hours * 100) / 100,
          earnings: Math.round(data.amount * 100) / 100,
        })),
        records: classesRecords.rows,
      };
    }

    // 2. School attendance report (Devangi and Admin)
    if (user.role === 'admin' || user.role === 'devangi') {
      const schoolStatusRes = await query(
        `SELECT 
          sds.id, sds.school_id, s.name as school_name, 
          TO_CHAR(sds.status_date, 'YYYY-MM-DD') as status_date, 
          sds.status, sds.note
         FROM public.school_daily_status sds
         LEFT JOIN public.schools s ON sds.school_id = s.id
         WHERE sds.status_date >= $1 AND sds.status_date <= $2
         ORDER BY sds.status_date ASC`,
        [monthStart, monthEnd]
      );

      let working = 0;
      let leaveBySchool = 0;
      let leaveTaken = 0;

      schoolStatusRes.rows.forEach(r => {
        if (r.status === 'working') working++;
        else if (r.status === 'leave_by_school') leaveBySchool++;
        else if (r.status === 'leave_taken') leaveTaken++;
      });

      reportData.school = {
        totalDaysMarked: schoolStatusRes.rows.length,
        workingDays: working,
        leaveBySchool,
        leaveTaken,
        records: schoolStatusRes.rows,
      };
    }

    // 3. Office attendance report (Shrikesh and Admin)
    if (user.role === 'admin' || user.role === 'shrikesh') {
      const officeStatusRes = await query(
        `SELECT 
          id, TO_CHAR(status_date, 'YYYY-MM-DD') as status_date, status, note 
         FROM public.office_daily_status
         WHERE status_date >= $1 AND status_date <= $2
         ORDER BY status_date ASC`,
        [monthStart, monthEnd]
      );

      let working = 0;
      let leaveByOffice = 0;
      let leaveTaken = 0;

      officeStatusRes.rows.forEach(r => {
        if (r.status === 'working') working++;
        else if (r.status === 'leave_by_office') leaveByOffice++;
        else if (r.status === 'leave_taken') leaveTaken++;
      });

      reportData.office = {
        totalDaysMarked: officeStatusRes.rows.length,
        workingDays: working,
        leaveByOffice,
        leaveTaken,
        records: officeStatusRes.rows,
      };
    }

    // 4. Daily Kharcha report
    let kharchaUserFilter = '';
    const kharchaParams: any[] = [monthStart, monthEnd];
    if (user.role !== 'admin') {
      kharchaParams.push(user.username.toLowerCase());
      kharchaUserFilter = `AND LOWER(user_id) = $3`;
    }

    const kharchaRes = await query(
      `SELECT 
        id, user_id, TO_CHAR(expense_date, 'YYYY-MM-DD') as expense_date, 
        amount, spent_on, payment_mode, category
       FROM public.daily_kharcha
       WHERE expense_date >= $1 AND expense_date <= $2 ${kharchaUserFilter}
       ORDER BY expense_date ASC, created_at ASC`,
      kharchaParams
    );

    let totalKharcha = 0;
    let cashKharcha = 0;
    let onlineKharcha = 0;
    const categoryKharchaMap: Record<string, number> = {};

    kharchaRes.rows.forEach(r => {
      const amt = Number(r.amount || 0);
      totalKharcha += amt;
      if (r.payment_mode === 'Cash') cashKharcha += amt;
      if (r.payment_mode === 'Online') onlineKharcha += amt;

      const cat = r.category || 'General';
      categoryKharchaMap[cat] = (categoryKharchaMap[cat] || 0) + amt;
    });

    reportData.kharcha = {
      total: Math.round(totalKharcha * 100) / 100,
      cash: Math.round(cashKharcha * 100) / 100,
      online: Math.round(onlineKharcha * 100) / 100,
      byCategory: Object.entries(categoryKharchaMap).map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
      })),
      records: kharchaRes.rows,
    };

    // 5. Family Money report
    let familyUserFilter = '';
    const familyParams: any[] = [monthStart, monthEnd];
    if (user.role !== 'admin') {
      familyParams.push(user.username.toLowerCase());
      familyUserFilter = `AND LOWER(user_id) = $3`;
    }

    const familyRes = await query(
      `SELECT 
        id, user_id, TO_CHAR(transaction_date, 'YYYY-MM-DD') as transaction_date, 
        transaction_type, person_name, amount, reason
       FROM public.family_money
       WHERE transaction_date >= $1 AND transaction_date <= $2 ${familyUserFilter}
       ORDER BY transaction_date ASC, created_at ASC`,
      familyParams
    );

    let received = 0;
    let sent = 0;
    let papaReceived = 0;
    let papaSent = 0;
    let otherSent = 0;
    const memberMap: Record<string, { received: number; sent: number }> = {};

    familyRes.rows.forEach(r => {
      const amt = Number(r.amount || 0);
      const person = r.person_name || 'Others';

      if (!memberMap[person]) memberMap[person] = { received: 0, sent: 0 };

      if (r.transaction_type === 'received') {
        received += amt;
        memberMap[person].received += amt;
        if (person.toLowerCase() === 'papa') papaReceived += amt;
      } else {
        sent += amt;
        memberMap[person].sent += amt;
        if (person.toLowerCase() === 'papa') papaSent += amt;
        else otherSent += amt;
      }
    });

    reportData.familyMoney = {
      totalReceived: Math.round(received * 100) / 100,
      totalSent: Math.round(sent * 100) / 100,
      netFlow: Math.round((received - sent) * 100) / 100,
      papaReceived: Math.round(papaReceived * 100) / 100,
      papaSent: Math.round(papaSent * 100) / 100,
      otherSent: Math.round(otherSent * 100) / 100,
      byMember: Object.entries(memberMap).map(([name, data]) => ({
        name,
        received: Math.round(data.received * 100) / 100,
        sent: Math.round(data.sent * 100) / 100,
      })),
      records: familyRes.rows,
    };

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error('Fetch monthly report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
