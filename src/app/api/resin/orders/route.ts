import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Helper to calculate the next sequential order number
export async function getNextOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);
  const prefix = `DRSIN${yearSuffix}`;

  const res = await query<{ order_no: string }>(
    `SELECT order_no FROM public.resin_orders 
     WHERE order_no LIKE $1 
     ORDER BY order_no DESC`,
    [`${prefix}%`]
  );

  let maxSeq = 0;
  for (const row of res.rows) {
    const suffix = row.order_no.replace(prefix, '');
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(4, '0');
  return `${prefix}${padded}`;
}

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
  const action = searchParams.get('action');

  // If requesting next sequential order number
  if (action === 'next_order_no') {
    try {
      const nextNo = await getNextOrderNumber();
      return NextResponse.json({ next_order_no: nextNo });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  const status = searchParams.get('status'); // 'paid' | 'unpaid'
  const paymentMode = searchParams.get('payment_mode'); // 'cod' | 'upi'
  const search = searchParams.get('search'); // customer or product or order_no
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
      sql += ` AND (customer_name ILIKE $${pIdx} OR product_name ILIKE $${pIdx} OR order_no ILIKE $${pIdx})`;
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    if (month) {
      sql += ` AND TO_CHAR(order_date, 'YYYY-MM') = $${pIdx++}`;
      params.push(month);
    }

    sql += ` ORDER BY created_at DESC`;

    const res = await query(sql, params);
    const nextOrderNo = await getNextOrderNumber();

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
      next_order_no: nextOrderNo,
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
      product_name,
      price,
      payment_mode,
      status,
      images,
      notes,
      order_date,
    } = body;

    if (!customer_name || !product_name || price === undefined) {
      return NextResponse.json(
        { error: 'Customer name, product name, and price are required' },
        { status: 400 }
      );
    }

    const validPaymentMode = payment_mode === 'cod' ? 'cod' : 'upi';
    const validStatus = status === 'paid' ? 'paid' : 'unpaid';
    const numericPrice = Number(price);

    if (isNaN(numericPrice) || numericPrice < 0) {
      return NextResponse.json({ error: 'Price must be a valid positive number' }, { status: 400 });
    }

    // Auto-generate sequential order number
    let orderNo = body.order_no;
    if (!orderNo || typeof orderNo !== 'string' || !orderNo.trim()) {
      orderNo = await getNextOrderNumber();
    } else {
      orderNo = orderNo.trim().toUpperCase();
    }

    // Format images array
    const imageList: string[] = Array.isArray(images)
      ? images.filter(img => typeof img === 'string' && img.trim().length > 0)
      : [];

    const orderDateVal = order_date || new Date().toISOString().split('T')[0];

    const insertRes = await query(
      `INSERT INTO public.resin_orders 
        (order_no, customer_name, product_name, price, payment_mode, status, images, notes, order_date, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        orderNo,
        customer_name.trim(),
        product_name.trim(),
        numericPrice,
        validPaymentMode,
        validStatus,
        imageList,
        notes || null,
        orderDateVal,
        user.username || 'devangi',
      ]
    );

    return NextResponse.json({
      success: true,
      order: insertRes.rows[0],
      message: `Order ${orderNo} created successfully`,
    });
  } catch (error: any) {
    console.error('Create resin order error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An order with this order number already exists. Please use a unique order number.' },
        { status: 409 }
      );
    }
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
    const { id, customer_name, product_name, price, payment_mode, status, images, notes, order_date } = body;

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

    if (product_name !== undefined) {
      updates.push(`product_name = $${pIdx++}`);
      params.push(product_name.trim());
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

    if (images !== undefined) {
      updates.push(`images = $${pIdx++}`);
      params.push(Array.isArray(images) ? images : []);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${pIdx++}`);
      params.push(notes);
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
      message: `Order ${res.rows[0].order_no} deleted`,
    });
  } catch (error: any) {
    console.error('Delete resin order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
