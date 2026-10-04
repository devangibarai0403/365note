import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ClassItem, ClassSubject } from '@/types';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Shrikesh has no classes access
  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const classesRes = await query<ClassItem>(
      'SELECT id, name, hourly_rate, description, is_active, created_at, updated_at FROM public.classes ORDER BY name ASC'
    );

    const subjectsRes = await query<ClassSubject>(
      `SELECT id, class_id, subject_name, hourly_rate, description, is_active, created_at, updated_at 
       FROM public.class_subjects 
       ORDER BY subject_name ASC`
    );

    // Map subjects to their corresponding class
    const subjectsByClass = new Map<string, ClassSubject[]>();
    for (const sub of subjectsRes.rows) {
      if (!subjectsByClass.has(sub.class_id)) {
        subjectsByClass.set(sub.class_id, []);
      }
      subjectsByClass.get(sub.class_id)!.push({
        ...sub,
        hourly_rate: Number(sub.hourly_rate),
      });
    }

    const classes = classesRes.rows.map(cls => ({
      ...cls,
      hourly_rate: Number(cls.hourly_rate),
      subjects: subjectsByClass.get(cls.id) || [],
    }));

    return NextResponse.json({ classes });
  } catch (error: any) {
    console.error('Fetch classes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'devangi')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, hourly_rate, description, subjects } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Valid class name is required' }, { status: 400 });
    }

    const defaultRate = hourly_rate !== undefined && !isNaN(Number(hourly_rate))
      ? Number(hourly_rate)
      : 500;

    const classRes = await query<ClassItem>(
      `INSERT INTO public.classes (name, hourly_rate, description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name.trim(), defaultRate, description?.trim() || null]
    );

    const newClass = classRes.rows[0];
    const createdSubjects: ClassSubject[] = [];

    // If subjects array provided, insert each
    if (Array.isArray(subjects) && subjects.length > 0) {
      for (const s of subjects) {
        if (s.subject_name && s.subject_name.trim()) {
          const rate = s.hourly_rate !== undefined && !isNaN(Number(s.hourly_rate))
            ? Number(s.hourly_rate)
            : defaultRate;
          const subRes = await query<ClassSubject>(
            `INSERT INTO public.class_subjects (class_id, subject_name, hourly_rate, description)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (class_id, subject_name) DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate
             RETURNING *`,
            [newClass.id, s.subject_name.trim(), rate, s.description?.trim() || null]
          );
          if (subRes.rows[0]) {
            createdSubjects.push({
              ...subRes.rows[0],
              hourly_rate: Number(subRes.rows[0].hourly_rate),
            });
          }
        }
      }
    }

    return NextResponse.json({
      class: {
        ...newClass,
        hourly_rate: Number(newClass.hourly_rate),
        subjects: createdSubjects,
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A class with this name already exists' }, { status: 409 });
    }
    console.error('Create class error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'devangi')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, name, hourly_rate, description, is_active, update_subjects_rate } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const rateNum =
      hourly_rate !== undefined && hourly_rate !== null && !isNaN(Number(hourly_rate))
        ? Number(hourly_rate)
        : null;

    let sql = 'UPDATE public.classes SET updated_at = NOW()';
    const params: any[] = [];

    if (name !== undefined && name !== null) {
      params.push(name.trim());
      sql += `, name = $${params.length}`;
    }
    if (rateNum !== null) {
      params.push(rateNum);
      sql += `, hourly_rate = $${params.length}`;
    }
    if (description !== undefined) {
      params.push(description?.trim() || null);
      sql += `, description = $${params.length}`;
    }
    if (is_active !== undefined && is_active !== null) {
      params.push(Boolean(is_active));
      sql += `, is_active = $${params.length}`;
    }

    params.push(id);
    sql += ` WHERE id = $${params.length} RETURNING *`;

    const res = await query<ClassItem>(sql, params);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // If admin/devangi opted to also sync all subjects under this class
    if (update_subjects_rate && rateNum !== null && rateNum > 0) {
      await query(
        `UPDATE public.class_subjects 
         SET hourly_rate = $1, updated_at = NOW() 
         WHERE class_id = $2`,
        [rateNum, id]
      );
    }

    return NextResponse.json({ class: res.rows[0] });
  } catch (error: any) {
    console.error('Update class error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
  }

  try {
    await query('DELETE FROM public.classes WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Class deleted successfully' });
  } catch (error: any) {
    console.error('Delete class error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
