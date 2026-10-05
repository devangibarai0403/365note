import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { OfficeDailyStatus } from '@/types';
import { getMonthDateRange } from '@/lib/time-utils';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Devangi has no office access
  if (user.role === 'devangi') {
    return NextResponse.json({ error: 'Forbidden: Office section is for Shrikesh and Admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM
  const date = searchParams.get('date');

  try {
    let sql = `
      SELECT 
        id, 
        office_id, 
        TO_CHAR(status_date, 'YYYY-MM-DD') as status_date, 
        status, 
        user_id, 
        note, 
        created_at
      FROM public.office_daily_status
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      params.push(date);
      sql += ` AND status_date = $${params.length}`;
    } else if (month) {
      const { startDate, endDate } = getMonthDateRange(month);
      params.push(startDate);
      params.push(endDate);
      sql += ` AND status_date >= $${params.length - 1} AND status_date <= $${params.length}`;
    }

    sql += ' ORDER BY status_date ASC';

    const res = await query<OfficeDailyStatus>(sql, params);

    // Calculate monthly totals
    let workingDays = 0;
    let leaveByOfficeDays = 0;
    let leaveTakenDays = 0;
    let halfDays = 0;

    res.rows.forEach(r => {
      if (r.status === 'working') workingDays++;
      else if (r.status === 'leave_by_office') leaveByOfficeDays++;
      else if (r.status === 'leave_taken') leaveTakenDays++;
      else if (r.status === 'half_day') halfDays++;
    });

    const effectiveWorkingDays = workingDays + (halfDays * 0.5);
    const effectiveLeaveTakenDays = leaveTakenDays + (halfDays * 0.5);

    return NextResponse.json({
      statuses: res.rows,
      summary: {
        totalDaysMarked: res.rows.length,
        workingDays,
        leaveByOfficeDays,
        leaveTakenDays,
        halfDays,
        effectiveWorkingDays,
        effectiveLeaveTakenDays,
      },
    });
  } catch (error: any) {
    console.error('Fetch office status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'devangi') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { status_date, status, note } = await req.json();

    if (!status_date || !status) {
      return NextResponse.json({ error: 'Status date and status are required' }, { status: 400 });
    }

    if (status === 'clear' || status === 'none') {
      await query('DELETE FROM public.office_daily_status WHERE status_date = $1', [status_date]);
      return NextResponse.json({ success: true, cleared: true, status_date });
    }

    if (!['working', 'leave_by_office', 'leave_taken', 'half_day'].includes(status)) {
      return NextResponse.json({ error: 'Invalid office status' }, { status: 400 });
    }

    // Get office id if any
    const officeRes = await query('SELECT id FROM public.office LIMIT 1');
    const officeId = officeRes.rows[0]?.id || null;

    const res = await query<OfficeDailyStatus>(
      `INSERT INTO public.office_daily_status 
        (office_id, status_date, status, user_id, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (status_date)
       DO UPDATE SET 
         status = EXCLUDED.status,
         note = EXCLUDED.note,
         updated_at = NOW()
       RETURNING 
         id, office_id, TO_CHAR(status_date, 'YYYY-MM-DD') as status_date, status, user_id, note, created_at`,
      [officeId, status_date, status, user.username, note || null]
    );

    return NextResponse.json({ statusRecord: res.rows[0] });
  } catch (error: any) {
    console.error('Save office status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'devangi') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    await query('DELETE FROM public.office_daily_status WHERE status_date = $1', [date]);
    return NextResponse.json({ success: true, date });
  } catch (error: any) {
    console.error('Delete office status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
