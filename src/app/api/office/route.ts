import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { OfficeItem } from '@/types';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Devangi has no office access
  if (user.role === 'devangi') {
    return NextResponse.json({ error: 'Forbidden: Office section is for Shrikesh and Admin' }, { status: 403 });
  }

  try {
    const res = await query<OfficeItem>(
      'SELECT id, company_name, location, monthly_salary, paid_leaves_days, per_leave_cut, notes, created_at FROM public.office LIMIT 1'
    );

    if (res.rows.length === 0) {
      const created = await query<OfficeItem>(
        `INSERT INTO public.office (company_name, location, monthly_salary, paid_leaves_days, per_leave_cut) 
         VALUES ('Main Office', 'HQ', 0, 0, 0) 
         RETURNING id, company_name, location, monthly_salary, paid_leaves_days, per_leave_cut, notes, created_at`
      );
      return NextResponse.json({
        office: {
          ...created.rows[0],
          monthly_salary: Number(created.rows[0].monthly_salary || 0),
          paid_leaves_days: Number(created.rows[0].paid_leaves_days || 0),
          per_leave_cut: Number(created.rows[0].per_leave_cut || 0),
        },
      });
    }

    const row = res.rows[0];
    return NextResponse.json({
      office: {
        ...row,
        monthly_salary: Number(row.monthly_salary || 0),
        paid_leaves_days: Number(row.paid_leaves_days || 0),
        per_leave_cut: Number(row.per_leave_cut || 0),
      },
    });
  } catch (error: any) {
    console.error('Fetch office error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'shrikesh')) {
    return NextResponse.json({ error: 'Forbidden: Admin or Shrikesh access required' }, { status: 403 });
  }

  try {
    const { company_name, location, monthly_salary, paid_leaves_days, per_leave_cut, notes } = await req.json();

    const check = await query('SELECT id FROM public.office LIMIT 1');
    if (check.rows.length === 0) {
      const inserted = await query<OfficeItem>(
        `INSERT INTO public.office (company_name, location, monthly_salary, paid_leaves_days, per_leave_cut, notes) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          company_name || 'Main Office',
          location || null,
          Number(monthly_salary || 0),
          Number(paid_leaves_days || 0),
          Number(per_leave_cut || 0),
          notes || null,
        ]
      );
      return NextResponse.json({
        office: {
          ...inserted.rows[0],
          monthly_salary: Number(inserted.rows[0].monthly_salary || 0),
          paid_leaves_days: Number(inserted.rows[0].paid_leaves_days || 0),
          per_leave_cut: Number(inserted.rows[0].per_leave_cut || 0),
        },
      });
    }

    const updated = await query<OfficeItem>(
      `UPDATE public.office 
       SET company_name = COALESCE($1, company_name),
           location = COALESCE($2, location),
           monthly_salary = COALESCE($3, monthly_salary),
           paid_leaves_days = COALESCE($4, paid_leaves_days),
           per_leave_cut = COALESCE($5, per_leave_cut),
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        company_name !== undefined ? company_name : null,
        location !== undefined ? location : null,
        monthly_salary !== undefined ? Number(monthly_salary) : null,
        paid_leaves_days !== undefined ? Number(paid_leaves_days) : null,
        per_leave_cut !== undefined ? Number(per_leave_cut) : null,
        notes !== undefined ? notes : null,
        check.rows[0].id,
      ]
    );

    const row = updated.rows[0];
    return NextResponse.json({
      office: {
        ...row,
        monthly_salary: Number(row.monthly_salary || 0),
        paid_leaves_days: Number(row.paid_leaves_days || 0),
        per_leave_cut: Number(row.per_leave_cut || 0),
      },
    });
  } catch (error: any) {
    console.error('Update office error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
