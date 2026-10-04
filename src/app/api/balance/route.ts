import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserParam = searchParams.get('user_id');
  const targetUser = (user.role === 'admin' && targetUserParam ? targetUserParam : user.username).toLowerCase();

  try {
    // 1. Get initial balances
    const balRes = await query<{
      user_id: string;
      initial_cash: string | number;
      initial_online: string | number;
      updated_at: string;
    }>(
      `SELECT user_id, initial_cash, initial_online, updated_at 
       FROM public.user_balances 
       WHERE LOWER(user_id) = $1`,
      [targetUser]
    );

    let initialCash = 0;
    let initialOnline = 0;
    let updatedAt = new Date().toISOString();

    if (balRes.rows.length > 0) {
      initialCash = Number(balRes.rows[0].initial_cash || 0);
      initialOnline = Number(balRes.rows[0].initial_online || 0);
      updatedAt = balRes.rows[0].updated_at;
    } else {
      // Ensure row exists
      await query(
        `INSERT INTO public.user_balances (user_id, initial_cash, initial_online)
         VALUES ($1, 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [targetUser]
      );
    }

    // 2. Cumulative family money flows (in/out) for targetUser
    const flowRes = await query<{
      cash_received: string | number;
      cash_sent: string | number;
      online_received: string | number;
      online_sent: string | number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'received' AND LOWER(COALESCE(payment_mode, 'online')) = 'cash' THEN amount ELSE 0 END), 0) AS cash_received,
        COALESCE(SUM(CASE WHEN transaction_type = 'sent' AND LOWER(COALESCE(payment_mode, 'online')) = 'cash' THEN amount ELSE 0 END), 0) AS cash_sent,
        COALESCE(SUM(CASE WHEN transaction_type = 'received' AND LOWER(COALESCE(payment_mode, 'online')) = 'online' THEN amount ELSE 0 END), 0) AS online_received,
        COALESCE(SUM(CASE WHEN transaction_type = 'sent' AND LOWER(COALESCE(payment_mode, 'online')) = 'online' THEN amount ELSE 0 END), 0) AS online_sent
       FROM public.family_money
       WHERE LOWER(user_id) = $1`,
      [targetUser]
    );

    const cashReceived = Number(flowRes.rows[0]?.cash_received || 0);
    const cashSent = Number(flowRes.rows[0]?.cash_sent || 0);
    const onlineReceived = Number(flowRes.rows[0]?.online_received || 0);
    const onlineSent = Number(flowRes.rows[0]?.online_sent || 0);

    // 3. Cumulative daily kharcha expenses (cash/online) for targetUser
    const kharchaRes = await query<{
      kharcha_cash: string | number;
      kharcha_online: string | number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0) AS kharcha_cash,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'online' THEN amount ELSE 0 END), 0) AS kharcha_online
       FROM public.daily_kharcha
       WHERE LOWER(user_id) = $1`,
      [targetUser]
    );

    const kharchaCash = Number(kharchaRes.rows[0]?.kharcha_cash || 0);
    const kharchaOnline = Number(kharchaRes.rows[0]?.kharcha_online || 0);

    // Live Available Balances: initial + received - sent - kharcha
    const availableCash = Math.round((initialCash + cashReceived - cashSent - kharchaCash) * 100) / 100;
    const availableOnline = Math.round((initialOnline + onlineReceived - onlineSent - kharchaOnline) * 100) / 100;
    const totalAvailable = Math.round((availableCash + availableOnline) * 100) / 100;

    return NextResponse.json({
      balance: {
        user_id: targetUser,
        initial_cash: initialCash,
        initial_online: initialOnline,
        cash_received: cashReceived,
        cash_sent: cashSent,
        online_received: onlineReceived,
        online_sent: onlineSent,
        kharcha_cash: kharchaCash,
        kharcha_online: kharchaOnline,
        available_cash: availableCash,
        available_online: availableOnline,
        total_available: totalAvailable,
        updated_at: updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Fetch balance error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { cash, online, for_user } = await req.json();

    const targetUser = (user.role === 'admin' && for_user ? for_user : user.username).toLowerCase();

    const desiredCash = cash !== undefined && !isNaN(Number(cash)) ? Number(cash) : null;
    const desiredOnline = online !== undefined && !isNaN(Number(online)) ? Number(online) : null;

    if (desiredCash === null && desiredOnline === null) {
      return NextResponse.json({ error: 'Please provide cash or online amount' }, { status: 400 });
    }

    // Get current family money flows
    const flowRes = await query<{
      cash_received: string | number;
      cash_sent: string | number;
      online_received: string | number;
      online_sent: string | number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'received' AND LOWER(COALESCE(payment_mode, 'online')) = 'cash' THEN amount ELSE 0 END), 0) AS cash_received,
        COALESCE(SUM(CASE WHEN transaction_type = 'sent' AND LOWER(COALESCE(payment_mode, 'online')) = 'cash' THEN amount ELSE 0 END), 0) AS cash_sent,
        COALESCE(SUM(CASE WHEN transaction_type = 'received' AND LOWER(COALESCE(payment_mode, 'online')) = 'online' THEN amount ELSE 0 END), 0) AS online_received,
        COALESCE(SUM(CASE WHEN transaction_type = 'sent' AND LOWER(COALESCE(payment_mode, 'online')) = 'online' THEN amount ELSE 0 END), 0) AS online_sent
       FROM public.family_money
       WHERE LOWER(user_id) = $1`,
      [targetUser]
    );

    const cashReceived = Number(flowRes.rows[0]?.cash_received || 0);
    const cashSent = Number(flowRes.rows[0]?.cash_sent || 0);
    const onlineReceived = Number(flowRes.rows[0]?.online_received || 0);
    const onlineSent = Number(flowRes.rows[0]?.online_sent || 0);

    // Get current daily kharcha expenses
    const kharchaRes = await query<{
      kharcha_cash: string | number;
      kharcha_online: string | number;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0) AS kharcha_cash,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'online' THEN amount ELSE 0 END), 0) AS kharcha_online
       FROM public.daily_kharcha
       WHERE LOWER(user_id) = $1`,
      [targetUser]
    );

    const kharchaCash = Number(kharchaRes.rows[0]?.kharcha_cash || 0);
    const kharchaOnline = Number(kharchaRes.rows[0]?.kharcha_online || 0);

    // available = initial + received - sent - kharcha
    // => initial = available - received + sent + kharcha
    const newInitialCash = desiredCash !== null ? desiredCash - cashReceived + cashSent + kharchaCash : null;
    const newInitialOnline = desiredOnline !== null ? desiredOnline - onlineReceived + onlineSent + kharchaOnline : null;

    // Check existing
    const existing = await query(
      `SELECT initial_cash, initial_online FROM public.user_balances WHERE LOWER(user_id) = $1`,
      [targetUser]
    );

    let finalInitialCash = newInitialCash !== null ? newInitialCash : (existing.rows[0]?.initial_cash || 0);
    let finalInitialOnline = newInitialOnline !== null ? newInitialOnline : (existing.rows[0]?.initial_online || 0);

    await query(
      `INSERT INTO public.user_balances (user_id, initial_cash, initial_online, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET 
         initial_cash = EXCLUDED.initial_cash,
         initial_online = EXCLUDED.initial_online,
         updated_at = NOW()`,
      [targetUser, finalInitialCash, finalInitialOnline]
    );

    const updatedCash = Math.round((finalInitialCash + cashReceived - cashSent - kharchaCash) * 100) / 100;
    const updatedOnline = Math.round((finalInitialOnline + onlineReceived - onlineSent - kharchaOnline) * 100) / 100;

    return NextResponse.json({
      success: true,
      balance: {
        user_id: targetUser,
        initial_cash: finalInitialCash,
        initial_online: finalInitialOnline,
        available_cash: updatedCash,
        available_online: updatedOnline,
        total_available: Math.round((updatedCash + updatedOnline) * 100) / 100,
        cash_received: cashReceived,
        cash_sent: cashSent,
        online_received: onlineReceived,
        online_sent: onlineSent,
        kharcha_cash: kharchaCash,
        kharcha_online: kharchaOnline,
      },
    });
  } catch (error: any) {
    console.error('Update balance error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
