import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SchoolItem } from '@/types';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Shrikesh has no school access
  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden: School section is for Devangi and Admin' }, { status: 403 });
  }

  try {
    const schoolsRes = await query<SchoolItem>(
      `SELECT 
        id, 
        name, 
        monthly_salary, 
        paid_leaves_days,
        per_leave_cut,
        TO_CHAR(joining_date, 'YYYY-MM-DD') as joining_date, 
        notes, 
        is_active, 
        created_at
       FROM public.schools 
       ORDER BY name ASC`
    );

    const docsRes = await query<{
      id: string;
      school_id: string;
      document_title: string;
      document_type: string;
      file_url: string;
      file_name: string;
      file_size: number;
      created_at: string;
    }>('SELECT * FROM public.school_documents ORDER BY created_at DESC');

    const docsBySchool = new Map<string, any[]>();
    docsRes.rows.forEach(d => {
      const arr = docsBySchool.get(d.school_id) || [];
      arr.push(d);
      docsBySchool.set(d.school_id, arr);
    });

    const schoolsWithDocs = schoolsRes.rows.map(s => ({
      ...s,
      monthly_salary: Number(s.monthly_salary || 0),
      paid_leaves_days: Number(s.paid_leaves_days || 0),
      per_leave_cut: Number(s.per_leave_cut || 0),
      documents: docsBySchool.get(s.id) || [],
    }));

    return NextResponse.json({ schools: schoolsWithDocs });
  } catch (error: any) {
    console.error('Fetch schools error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'devangi')) {
    return NextResponse.json({ error: 'Forbidden: Admin or Devangi access required' }, { status: 403 });
  }

  try {
    const { name, monthly_salary, paid_leaves_days, per_leave_cut, joining_date, notes } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }

    const res = await query<SchoolItem>(
      `INSERT INTO public.schools (name, monthly_salary, paid_leaves_days, per_leave_cut, joining_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, monthly_salary, paid_leaves_days, per_leave_cut, TO_CHAR(joining_date, 'YYYY-MM-DD') as joining_date, notes, is_active, created_at`,
      [
        name.trim(),
        Number(monthly_salary || 0),
        Number(paid_leaves_days || 0),
        Number(per_leave_cut || 0),
        joining_date || null,
        notes || null,
      ]
    );

    return NextResponse.json({
      school: {
        ...res.rows[0],
        monthly_salary: Number(res.rows[0].monthly_salary || 0),
        paid_leaves_days: Number(res.rows[0].paid_leaves_days || 0),
        per_leave_cut: Number(res.rows[0].per_leave_cut || 0),
        documents: [],
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create school error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'devangi')) {
    return NextResponse.json({ error: 'Forbidden: Admin or Devangi access required' }, { status: 403 });
  }

  try {
    const { id, name, monthly_salary, paid_leaves_days, per_leave_cut, joining_date, notes, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const res = await query<SchoolItem>(
      `UPDATE public.schools 
       SET name = COALESCE($1, name),
           monthly_salary = COALESCE($2, monthly_salary),
           paid_leaves_days = COALESCE($3, paid_leaves_days),
           per_leave_cut = COALESCE($4, per_leave_cut),
           joining_date = COALESCE($5, joining_date),
           notes = COALESCE($6, notes),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, name, monthly_salary, paid_leaves_days, per_leave_cut, TO_CHAR(joining_date, 'YYYY-MM-DD') as joining_date, notes, is_active, created_at`,
      [
        name ? name.trim() : null,
        monthly_salary !== undefined ? Number(monthly_salary) : null,
        paid_leaves_days !== undefined ? Number(paid_leaves_days) : null,
        per_leave_cut !== undefined ? Number(per_leave_cut) : null,
        joining_date || null,
        notes !== undefined ? notes : null,
        is_active !== undefined ? is_active : null,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const updated = res.rows[0];
    return NextResponse.json({
      school: {
        ...updated,
        monthly_salary: Number(updated.monthly_salary || 0),
        paid_leaves_days: Number(updated.paid_leaves_days || 0),
        per_leave_cut: Number(updated.per_leave_cut || 0),
      },
    });
  } catch (error: any) {
    console.error('Update school error:', error);
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
    return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
  }

  try {
    await query('DELETE FROM public.schools WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'School deleted successfully' });
  } catch (error: any) {
    console.error('Delete school error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
