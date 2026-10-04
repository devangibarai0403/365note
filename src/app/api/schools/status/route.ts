import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SchoolDailyStatus } from '@/types';
import { getMonthDateRange } from '@/lib/time-utils';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get('school_id');
  const month = searchParams.get('month'); // YYYY-MM
  const date = searchParams.get('date');

  try {
    let sql = `
      SELECT 
        sds.id,
        sds.school_id,
        s.name as school_name,
        TO_CHAR(sds.status_date, 'YYYY-MM-DD') as status_date,
        sds.status,
        sds.user_id,
        sds.note,
        sds.created_at
      FROM public.school_daily_status sds
      LEFT JOIN public.schools s ON sds.school_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      sql += ` AND sds.school_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND sds.status_date = $${params.length}`;
    } else if (month) {
      const { startDate, endDate } = getMonthDateRange(month);
      params.push(startDate);
      params.push(endDate);
      sql += ` AND sds.status_date >= $${params.length - 1} AND sds.status_date <= $${params.length}`;
    }

    sql += ' ORDER BY sds.status_date ASC';

    const res = await query<SchoolDailyStatus>(sql, params);

    // Calculate monthly summary
    let workingDays = 0;
    let leaveBySchoolDays = 0;
    let leaveTakenDays = 0;

    res.rows.forEach(r => {
      if (r.status === 'working') workingDays++;
      else if (r.status === 'leave_by_school') leaveBySchoolDays++;
      else if (r.status === 'leave_taken') leaveTakenDays++;
    });

    return NextResponse.json({
      statuses: res.rows,
      summary: {
        totalDaysMarked: res.rows.length,
        workingDays,
        leaveBySchoolDays,
        leaveTakenDays,
      },
    });
  } catch (error: any) {
    console.error('Fetch school daily status error:', error);
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
    const { school_id, status_date, status, note } = await req.json();

    if (!school_id || !status_date || !status) {
      return NextResponse.json(
        { error: 'School ID, status date, and status are required' },
        { status: 400 }
      );
    }

    if (status === 'clear' || status === 'none') {
      await query('DELETE FROM public.school_daily_status WHERE school_id = $1 AND status_date = $2', [school_id, status_date]);
      return NextResponse.json({ success: true, cleared: true, school_id, status_date });
    }

    if (!['working', 'leave_by_school', 'leave_taken'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const res = await query<SchoolDailyStatus>(
      `INSERT INTO public.school_daily_status 
        (school_id, status_date, status, user_id, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (school_id, status_date) 
       DO UPDATE SET 
         status = EXCLUDED.status,
         note = EXCLUDED.note,
         updated_at = NOW()
       RETURNING 
         id, school_id, TO_CHAR(status_date, 'YYYY-MM-DD') as status_date, status, user_id, note, created_at`,
      [school_id, status_date, status, user.username, note || null]
    );

    return NextResponse.json({ statusRecord: res.rows[0] });
  } catch (error: any) {
    console.error('Save school status error:', error);
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
  const schoolId = searchParams.get('school_id');
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    if (schoolId) {
      await query('DELETE FROM public.school_daily_status WHERE school_id = $1 AND status_date = $2', [schoolId, date]);
    } else {
      await query('DELETE FROM public.school_daily_status WHERE status_date = $1', [date]);
    }
    return NextResponse.json({ success: true, date });
  } catch (error: any) {
    console.error('Delete school status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
