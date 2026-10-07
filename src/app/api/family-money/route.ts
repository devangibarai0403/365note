import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { FamilyMoneyTransaction } from '@/types';
import { getMonthDateRange } from '@/lib/time-utils';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM
  const date = searchParams.get('date');
  const targetUser = searchParams.get('user_id'); // Admin can view specific user

  try {
    let sql = `
      SELECT 
        id, 
        user_id, 
        TO_CHAR(transaction_date, 'YYYY-MM-DD') as transaction_date, 
        transaction_type, 
        person_name, 
        amount, 
        COALESCE(payment_mode, 'Online') as payment_mode,
        reason, 
        created_at
      FROM public.family_money
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based filtering
    if (user.role === 'admin') {
      if (targetUser) {
        params.push(targetUser.toLowerCase());
        sql += ` AND LOWER(user_id) = $${params.length}`;
      }
    } else {
      params.push(user.username.toLowerCase());
      sql += ` AND LOWER(user_id) = $${params.length}`;
    }

    // Never include LIC deduction records in Family Money
    sql += ` AND UPPER(person_name) != 'LIC' AND (reason IS NULL OR reason NOT ILIKE '%LIC%')`;

    if (date) {
      params.push(date);
      sql += ` AND transaction_date = $${params.length}`;
    } else if (month) {
      const { startDate, endDate } = getMonthDateRange(month);
      params.push(startDate);
      params.push(endDate);
      sql += ` AND transaction_date >= $${params.length - 1} AND transaction_date <= $${params.length}`;
    }

    sql += ' ORDER BY transaction_date DESC, created_at DESC';

    const res = await query<FamilyMoneyTransaction>(sql, params);

    // Monthly analytics calculation
    let totalReceived = 0;
    let totalSent = 0;
    let receivedFromPapa = 0;
    let sentToPapa = 0;
    let sentToOtherFamily = 0;
    let cashReceived = 0;
    let cashSent = 0;
    let onlineReceived = 0;
    let onlineSent = 0;
    const memberBreakdown: Record<string, { received: number; sent: number }> = {};

    let licSent = 0;

    res.rows.forEach(r => {
      const amt = Number(r.amount || 0);
      const person = r.person_name || 'Unknown';
      const mode = (r.payment_mode || 'Online').toLowerCase();
      const isLic = person.toUpperCase() === 'LIC' || (r.reason && r.reason.toUpperCase().includes('LIC'));

      if (!memberBreakdown[person]) {
        memberBreakdown[person] = { received: 0, sent: 0 };
      }

      if (r.transaction_type === 'received') {
        totalReceived += amt;
        memberBreakdown[person].received += amt;
        if (person.toLowerCase() === 'papa') {
          receivedFromPapa += amt;
        }
        if (mode === 'cash') {
          cashReceived += amt;
        } else {
          onlineReceived += amt;
        }
      } else if (r.transaction_type === 'sent') {
        if (isLic) {
          // Track LIC separately - do not count towards total sent to family members
          licSent += amt;
          memberBreakdown[person].sent += amt;
        } else {
          totalSent += amt;
          memberBreakdown[person].sent += amt;
          if (person.toLowerCase() === 'papa') {
            sentToPapa += amt;
          } else {
            sentToOtherFamily += amt;
          }
          if (mode === 'cash') {
            cashSent += amt;
          } else {
            onlineSent += amt;
          }
        }
      }
    });

    return NextResponse.json({
      transactions: res.rows,
      summary: {
        totalReceived: Math.round(totalReceived * 100) / 100,
        totalSent: Math.round(totalSent * 100) / 100,
        licSent: Math.round(licSent * 100) / 100,
        netFlow: Math.round((totalReceived - totalSent) * 100) / 100,
        receivedFromPapa: Math.round(receivedFromPapa * 100) / 100,
        sentToPapa: Math.round(sentToPapa * 100) / 100,
        sentToOtherFamily: Math.round(sentToOtherFamily * 100) / 100,
        cashReceived: Math.round(cashReceived * 100) / 100,
        cashSent: Math.round(cashSent * 100) / 100,
        onlineReceived: Math.round(onlineReceived * 100) / 100,
        onlineSent: Math.round(onlineSent * 100) / 100,
        memberBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Fetch family money error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      transaction_date,
      transaction_type,
      person_name,
      amount,
      payment_mode,
      reason,
      for_user,
    } = await req.json();

    if (!transaction_type || !['received', 'sent'].includes(transaction_type)) {
      return NextResponse.json({ error: 'Valid transaction type is required (received or sent)' }, { status: 400 });
    }

    if (!person_name || !person_name.trim()) {
      return NextResponse.json({ error: 'Person name is required' }, { status: 400 });
    }

    if (amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid transaction amount is required' }, { status: 400 });
    }

    const assignedUser = user.role === 'admin' && for_user ? for_user.toLowerCase() : user.username;
    const finalDate = transaction_date || new Date().toISOString().split('T')[0];
    const finalPaymentMode = payment_mode === 'Cash' ? 'Cash' : 'Online';

    const res = await query<FamilyMoneyTransaction>(
      `INSERT INTO public.family_money 
        (user_id, transaction_date, transaction_type, person_name, amount, payment_mode, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING 
         id, user_id, TO_CHAR(transaction_date, 'YYYY-MM-DD') as transaction_date, 
         transaction_type, person_name, amount, payment_mode, reason, created_at`,
      [
        assignedUser,
        finalDate,
        transaction_type,
        person_name.trim(),
        Number(amount),
        finalPaymentMode,
        reason || null,
      ]
    );

    return NextResponse.json({ transaction: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Create family money error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
  }

  try {
    if (user.role === 'admin') {
      await query('DELETE FROM public.family_money WHERE id = $1', [id]);
    } else {
      await query('DELETE FROM public.family_money WHERE id = $1 AND user_id = $2', [
        id,
        user.username,
      ]);
    }

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error: any) {
    console.error('Delete family money error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
