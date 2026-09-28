import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ClassItem } from '@/types';

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
    const res = await query<ClassItem>(
      'SELECT id, name, hourly_rate, description, is_active, created_at, updated_at FROM public.classes ORDER BY name ASC'
    );
    return NextResponse.json({ classes: res.rows });
  } catch (error: any) {
    console.error('Fetch classes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  try {
    const { name, hourly_rate, description } = await req.json();

    if (!name || hourly_rate === undefined || isNaN(Number(hourly_rate))) {
      return NextResponse.json({ error: 'Valid class name and hourly rate are required' }, { status: 400 });
    }

    const res = await query<ClassItem>(
      `INSERT INTO public.classes (name, hourly_rate, description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name.trim(), Number(hourly_rate), description || null]
    );

    return NextResponse.json({ class: res.rows[0] }, { status: 201 });
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
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
  }

  try {
    const { id, name, hourly_rate, description, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    const res = await query<ClassItem>(
      `UPDATE public.classes 
       SET name = COALESCE($1, name),
           hourly_rate = COALESCE($2, hourly_rate),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        name ? name.trim() : null,
        hourly_rate !== undefined ? Number(hourly_rate) : null,
        description !== undefined ? description : null,
        is_active !== undefined ? is_active : null,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    return NextResponse.json({ class: res.rows[0] });
  } catch (error: any) {
    console.error('Update class error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
