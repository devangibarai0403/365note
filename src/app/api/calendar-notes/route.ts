import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { AdminCalendarNote } from '@/types';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin calendar notes are for Admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM
  const date = searchParams.get('date');

  try {
    let sql = `
      SELECT 
        id, 
        TO_CHAR(note_date, 'YYYY-MM-DD') as note_date, 
        title, 
        note, 
        tag, 
        created_at, 
        updated_at
      FROM public.admin_calendar_notes
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      params.push(date);
      sql += ` AND note_date = $${params.length}`;
    } else if (month) {
      params.push(`${month}-01`);
      params.push(`${month}-31`);
      sql += ` AND note_date >= $${params.length - 1} AND note_date <= $${params.length}`;
    }

    sql += ' ORDER BY note_date ASC, created_at ASC';

    const res = await query<AdminCalendarNote>(sql, params);
    return NextResponse.json({ notes: res.rows });
  } catch (error: any) {
    console.error('Fetch admin notes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { note_date, title, note, tag } = await req.json();

    if (!note_date || !note || !note.trim()) {
      return NextResponse.json({ error: 'Date and note content are required' }, { status: 400 });
    }

    const res = await query<AdminCalendarNote>(
      `INSERT INTO public.admin_calendar_notes 
        (note_date, title, note, tag)
       VALUES ($1, $2, $3, $4)
       RETURNING 
         id, TO_CHAR(note_date, 'YYYY-MM-DD') as note_date, title, note, tag, created_at, updated_at`,
      [note_date, title || null, note.trim(), tag || 'General']
    );

    return NextResponse.json({ note: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Create admin note error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { id, title, note, tag } = await req.json();

    if (!id || !note || !note.trim()) {
      return NextResponse.json({ error: 'Note ID and content are required' }, { status: 400 });
    }

    const res = await query<AdminCalendarNote>(
      `UPDATE public.admin_calendar_notes 
       SET title = COALESCE($1, title),
           note = $2,
           tag = COALESCE($3, tag),
           updated_at = NOW()
       WHERE id = $4
       RETURNING 
         id, TO_CHAR(note_date, 'YYYY-MM-DD') as note_date, title, note, tag, created_at, updated_at`,
      [title || null, note.trim(), tag || 'General', id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note: res.rows[0] });
  } catch (error: any) {
    console.error('Update admin note error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
  }

  try {
    await query('DELETE FROM public.admin_calendar_notes WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Note deleted' });
  } catch (error: any) {
    console.error('Delete admin note error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
