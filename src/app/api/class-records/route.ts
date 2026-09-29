import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ClassRecord, ClassSubject } from '@/types';
import { calculateDurationHours, formatTimeDisplay } from '@/lib/time-utils';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden: Classes are only accessible to Devangi and Admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const month = searchParams.get('month'); // YYYY-MM
  const className = searchParams.get('class_name');
  const subjectName = searchParams.get('subject_name');

  try {
    let sql = `
      SELECT 
        id, 
        class_id, 
        class_name, 
        subject_id,
        subject_name,
        TO_CHAR(record_date, 'YYYY-MM-DD') as record_date, 
        from_time, 
        to_time, 
        hours, 
        hourly_rate, 
        total_amount, 
        notes, 
        imported_from_excel, 
        created_by, 
        created_at
      FROM public.class_records
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      params.push(date);
      sql += ` AND record_date = $${params.length}`;
    } else if (month) {
      params.push(`${month}-01`);
      params.push(`${month}-31`);
      sql += ` AND record_date >= $${params.length - 1} AND record_date <= $${params.length}`;
    }

    if (className) {
      params.push(className);
      sql += ` AND class_name = $${params.length}`;
    }

    if (subjectName) {
      params.push(subjectName);
      sql += ` AND subject_name = $${params.length}`;
    }

    sql += ' ORDER BY record_date DESC, created_at DESC';

    const res = await query<ClassRecord>(sql, params);

    // Compute aggregate metrics
    let totalHours = 0;
    let totalEarnings = 0;
    res.rows.forEach(r => {
      totalHours += Number(r.hours || 0);
      totalEarnings += Number(r.total_amount || 0);
    });

    return NextResponse.json({
      records: res.rows,
      summary: {
        totalRecords: res.rows.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
      }
    });
  } catch (error: any) {
    console.error('Fetch class records error:', error);
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
    const {
      class_id,
      class_name,
      subject_id,
      subject_name,
      record_date,
      from_time,
      to_time,
      hours: manualHours,
      notes,
    } = body;

    if (!record_date || !from_time || !to_time) {
      return NextResponse.json({ error: 'Record date, from time, and to time are required' }, { status: 400 });
    }

    // Lookup class
    let targetClassId = class_id;
    let targetClassName = class_name;
    let fallbackRate = 500;

    if (class_id) {
      const classRes = await query<{ id: string; name: string; hourly_rate: number }>(
        'SELECT id, name, hourly_rate FROM public.classes WHERE id = $1',
        [class_id]
      );
      if (classRes.rows.length > 0) {
        targetClassName = classRes.rows[0].name;
        fallbackRate = Number(classRes.rows[0].hourly_rate) || 500;
      }
    } else if (class_name) {
      const classRes = await query<{ id: string; name: string; hourly_rate: number }>(
        'SELECT id, name, hourly_rate FROM public.classes WHERE LOWER(name) = LOWER($1)',
        [class_name.trim()]
      );
      if (classRes.rows.length > 0) {
        targetClassId = classRes.rows[0].id;
        targetClassName = classRes.rows[0].name;
        fallbackRate = Number(classRes.rows[0].hourly_rate) || 500;
      } else {
        return NextResponse.json({ error: `Class "${class_name}" not found in system` }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Class must be selected' }, { status: 400 });
    }

    // Lookup subject and determine subject-specific hourly rate
    let targetSubjectId: string | null = subject_id || null;
    let targetSubjectName: string | null = subject_name || null;
    let hourlyRate = fallbackRate;

    if (targetSubjectId) {
      const subRes = await query<ClassSubject>(
        'SELECT id, class_id, subject_name, hourly_rate FROM public.class_subjects WHERE id = $1',
        [targetSubjectId]
      );
      if (subRes.rows.length > 0) {
        targetSubjectName = subRes.rows[0].subject_name;
        hourlyRate = Number(subRes.rows[0].hourly_rate);
      }
    } else if (targetSubjectName && targetClassId) {
      const subRes = await query<ClassSubject>(
        'SELECT id, class_id, subject_name, hourly_rate FROM public.class_subjects WHERE class_id = $1 AND LOWER(subject_name) = LOWER($2)',
        [targetClassId, targetSubjectName.trim()]
      );
      if (subRes.rows.length > 0) {
        targetSubjectId = subRes.rows[0].id;
        targetSubjectName = subRes.rows[0].subject_name;
        hourlyRate = Number(subRes.rows[0].hourly_rate);
      }
    } else if (targetClassId) {
      // Pick first subject of this class if available
      const subRes = await query<ClassSubject>(
        'SELECT id, class_id, subject_name, hourly_rate FROM public.class_subjects WHERE class_id = $1 ORDER BY subject_name ASC LIMIT 1',
        [targetClassId]
      );
      if (subRes.rows.length > 0) {
        targetSubjectId = subRes.rows[0].id;
        targetSubjectName = subRes.rows[0].subject_name;
        hourlyRate = Number(subRes.rows[0].hourly_rate);
      }
    }

    // Calculate hours automatically
    const calculatedHours = manualHours !== undefined && manualHours !== null && manualHours > 0
      ? Number(manualHours)
      : calculateDurationHours(from_time, to_time);

    if (calculatedHours <= 0) {
      return NextResponse.json({ error: 'Calculated hours must be greater than 0' }, { status: 400 });
    }

    // Calculate total amount = hours * frozen hourly rate
    const totalAmount = Math.round(calculatedHours * hourlyRate * 100) / 100;
    const formattedFrom = formatTimeDisplay(from_time);
    const formattedTo = formatTimeDisplay(to_time);

    // Check if duplicate entry already exists for same class, subject, date, time
    const existingEntry = await query<ClassRecord>(
      `SELECT id FROM public.class_records 
       WHERE class_name = $1 
         AND record_date = $2 
         AND from_time = $3 
         AND to_time = $4 
         AND (subject_name = $5 OR ($5 IS NULL AND subject_name IS NULL))`,
      [targetClassName, record_date, formattedFrom, formattedTo, targetSubjectName]
    );

    let recordResult;
    if (existingEntry.rows.length > 0) {
      const updateRes = await query<ClassRecord>(
        `UPDATE public.class_records 
         SET class_id = $1,
             subject_id = $2,
             hours = $3,
             hourly_rate = $4,
             total_amount = $5,
             notes = $6,
             updated_at = NOW()
         WHERE id = $7
         RETURNING 
           id, class_id, class_name, subject_id, subject_name, TO_CHAR(record_date, 'YYYY-MM-DD') as record_date, 
           from_time, to_time, hours, hourly_rate, total_amount, notes, imported_from_excel, created_by, created_at`,
        [
          targetClassId,
          targetSubjectId,
          calculatedHours,
          hourlyRate,
          totalAmount,
          notes || null,
          existingEntry.rows[0].id,
        ]
      );
      recordResult = updateRes.rows[0];
    } else {
      const insertRes = await query<ClassRecord>(
        `INSERT INTO public.class_records 
          (class_id, class_name, subject_id, subject_name, record_date, from_time, to_time, hours, hourly_rate, total_amount, notes, imported_from_excel, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING 
           id, class_id, class_name, subject_id, subject_name, TO_CHAR(record_date, 'YYYY-MM-DD') as record_date, 
           from_time, to_time, hours, hourly_rate, total_amount, notes, imported_from_excel, created_by, created_at`,
        [
          targetClassId,
          targetClassName,
          targetSubjectId,
          targetSubjectName,
          record_date,
          formattedFrom,
          formattedTo,
          calculatedHours,
          hourlyRate,
          totalAmount,
          notes || null,
          false,
          user.username,
        ]
      );
      recordResult = insertRes.rows[0];
    }

    return NextResponse.json({ record: recordResult }, { status: 201 });
  } catch (error: any) {
    console.error('Create class record error:', error);
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
    return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
  }

  try {
    await query('DELETE FROM public.class_records WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Class record deleted successfully' });
  } catch (error: any) {
    console.error('Delete class record error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
