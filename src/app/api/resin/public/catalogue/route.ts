import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let sql = `
      SELECT 
        id, 
        order_no, 
        product_name, 
        customer_name, 
        price, 
        images, 
        notes, 
        order_date, 
        created_at 
      FROM public.resin_orders 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      sql += ` AND (product_name ILIKE $1 OR customer_name ILIKE $1 OR order_no ILIKE $1)`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    const res = await query(sql, params);

    return NextResponse.json({
      orders: res.rows,
      total: res.rowCount,
    });
  } catch (error: any) {
    console.error('Public catalogue fetch error:', error);
    return NextResponse.json({ error: 'Failed to load catalogue' }, { status: 500 });
  }
}
