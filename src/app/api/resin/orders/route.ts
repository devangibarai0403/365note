import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Devangi and Admin have access
  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // 'paid' | 'unpaid'
  const paymentMode = searchParams.get('payment_mode'); // 'cod' | 'upi'
  const search = searchParams.get('search'); // customer_name
  const month = searchParams.get('month'); // YYYY-MM

  try {
    let sql = `SELECT * FROM public.resin_orders WHERE 1=1`;
    const params: any[] = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      sql += ` AND status = $${pIdx++}`;
      params.push(status);
    }

    if (paymentMode && paymentMode !== 'all') {
      sql += ` AND payment_mode = $${pIdx++}`;
      params.push(paymentMode);
    }

    if (search && search.trim()) {
      sql += ` AND customer_name ILIKE $${pIdx++}`;
      params.push(`%${search.trim()}%`);
    }

    if (month) {
      sql += ` AND TO_CHAR(order_date, 'YYYY-MM') = $${pIdx++}`;
      params.push(month);
    }

    sql += ` ORDER BY order_date DESC, created_at DESC`;

    const res = await query(sql, params);

    // Summary stats
    const statsRes = await query<{
      total_orders: string;
      paid_orders: string;
      unpaid_orders: string;
      total_revenue: string;
      paid_cod: string;
      paid_upi: string;
    }>(
      `SELECT
        COUNT(*)::text AS total_orders,
        COUNT(*) FILTER (WHERE status = 'paid')::text AS paid_orders,
        COUNT(*) FILTER (WHERE status = 'unpaid')::text AS unpaid_orders,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN price ELSE 0 END), 0)::text AS total_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' AND payment_mode = 'cod' THEN price ELSE 0 END), 0)::text AS paid_cod,
        COALESCE(SUM(CASE WHEN status = 'paid' AND payment_mode = 'upi' THEN price ELSE 0 END), 0)::text AS paid_upi
       FROM public.resin_orders`
    );

    return NextResponse.json({
      orders: res.rows,
      stats: {
        total_orders: Number(statsRes.rows[0]?.total_orders || 0),
        paid_orders: Number(statsRes.rows[0]?.paid_orders || 0),
        unpaid_orders: Number(statsRes.rows[0]?.unpaid_orders || 0),
        total_revenue: Number(statsRes.rows[0]?.total_revenue || 0),
        paid_cod: Number(statsRes.rows[0]?.paid_cod || 0),
        paid_upi: Number(statsRes.rows[0]?.paid_upi || 0),
      },
    });
  } catch (error: any) {
    console.error('Fetch resin orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      customer_name,
      price,
      payment_mode,
      status,
      order_date,
    } = body;

    if (!customer_name || !customer_name.trim() || price === undefined || price === null || price === '') {
      return NextResponse.json(
        { error: 'Customer name and price are required' },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ error: 'Price must be a valid positive number' }, { status: 400 });
    }

    const validPaymentMode = payment_mode === 'cod' ? 'cod' : 'upi';
    const validStatus = status === 'paid' ? 'paid' : 'unpaid';
    const orderDateVal = order_date || new Date().toISOString().split('T')[0];

    const insertRes = await query(
      `INSERT INTO public.resin_orders 
        (customer_name, price, payment_mode, status, order_date, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        customer_name.trim(),
        numericPrice,
        validPaymentMode,
        validStatus,
        orderDateVal,
        user.username || 'devangi',
      ]
    );

    return NextResponse.json({
      success: true,
      order: insertRes.rows[0],
      message: 'Order created successfully',
    });
  } catch (error: any) {
    console.error('Create resin order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, customer_name, price, payment_mode, status, order_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (customer_name !== undefined) {
      updates.push(`customer_name = $${pIdx++}`);
      params.push(customer_name.trim());
    }

    if (price !== undefined) {
      updates.push(`price = $${pIdx++}`);
      params.push(Number(price));
    }

    if (payment_mode !== undefined) {
      updates.push(`payment_mode = $${pIdx++}`);
      params.push(payment_mode === 'cod' ? 'cod' : 'upi');
    }

    if (status !== undefined) {
      updates.push(`status = $${pIdx++}`);
      params.push(status === 'paid' ? 'paid' : 'unpaid');
    }

    if (order_date !== undefined) {
      updates.push(`order_date = $${pIdx++}`);
      params.push(order_date);
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const sql = `UPDATE public.resin_orders SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING *`;

    const res = await query(sql, params);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: res.rows[0],
      message: 'Order updated successfully',
    });
  } catch (error: any) {
    console.error('Update resin order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const res = await query(`DELETE FROM public.resin_orders WHERE id = $1 RETURNING *`, [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete resin order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
