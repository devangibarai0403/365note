import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ClassSubject } from '@/types';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  try {
    const { class_id, subject_name, hourly_rate, description } = await req.json();

    if (!class_id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    if (!subject_name || !subject_name.trim()) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }

    if (hourly_rate === undefined || isNaN(Number(hourly_rate)) || Number(hourly_rate) <= 0) {
      return NextResponse.json({ error: 'Valid hourly price is required' }, { status: 400 });
    }

    const res = await query<ClassSubject>(
      `INSERT INTO public.class_subjects (class_id, subject_name, hourly_rate, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (class_id, subject_name) 
       DO UPDATE SET 
         hourly_rate = EXCLUDED.hourly_rate,
         description = COALESCE(EXCLUDED.description, public.class_subjects.description),
         is_active = TRUE,
         updated_at = NOW()
       RETURNING *`,
      [class_id, subject_name.trim(), Number(hourly_rate), description?.trim() || null]
    );

    return NextResponse.json({
      subject: {
        ...res.rows[0],
        hourly_rate: Number(res.rows[0].hourly_rate),
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create subject error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  try {
    const { id, subject_name, hourly_rate, description, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }

    const res = await query<ClassSubject>(
      `UPDATE public.class_subjects
       SET subject_name = COALESCE($1, subject_name),
           hourly_rate = COALESCE($2, hourly_rate),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        subject_name ? subject_name.trim() : null,
        hourly_rate !== undefined ? Number(hourly_rate) : null,
        description !== undefined ? description?.trim() : null,
        is_active !== undefined ? is_active : null,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({
      subject: {
        ...res.rows[0],
        hourly_rate: Number(res.rows[0].hourly_rate),
      }
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A subject with this name already exists in this class' }, { status: 409 });
    }
    console.error('Update subject error:', error);
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
    return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
  }

  try {
    await query('DELETE FROM public.class_subjects WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error: any) {
    console.error('Delete subject error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
