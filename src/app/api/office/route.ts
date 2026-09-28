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
      'SELECT id, company_name, location, notes, created_at FROM public.office LIMIT 1'
    );

    if (res.rows.length === 0) {
      const created = await query<OfficeItem>(
        `INSERT INTO public.office (company_name, location) 
         VALUES ('Main Office', 'HQ') 
         RETURNING id, company_name, location, notes, created_at`
      );
      return NextResponse.json({ office: created.rows[0] });
    }

    return NextResponse.json({ office: res.rows[0] });
  } catch (error: any) {
    console.error('Fetch office error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const { company_name, location, notes } = await req.json();

    const check = await query('SELECT id FROM public.office LIMIT 1');
    if (check.rows.length === 0) {
      const inserted = await query<OfficeItem>(
        `INSERT INTO public.office (company_name, location, notes) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [company_name || 'Main Office', location || null, notes || null]
      );
      return NextResponse.json({ office: inserted.rows[0] });
    }

    const updated = await query<OfficeItem>(
      `UPDATE public.office 
       SET company_name = COALESCE($1, company_name),
           location = COALESCE($2, location),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [company_name, location, notes, check.rows[0].id]
    );

    return NextResponse.json({ office: updated.rows[0] });
  } catch (error: any) {
    console.error('Update office error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
