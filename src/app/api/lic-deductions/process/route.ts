import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// This endpoint checks all active LIC deductions and processes them if today is the deduction day
// and the current month has not been processed yet.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targetUser = 'devangi';

  // Only devangi or admin
  if (user.role !== 'devangi' && user.role !== 'admin') {
    return NextResponse.json({ processed: [] });
  }

  try {
    const today = new Date();
    const todayDay = today.getDate();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = today.toISOString().split('T')[0];

    // Fetch active deductions that haven't been processed this month
    const deductionsRes = await query<{
      id: string;
      amount: string | number;
      deduction_day: number;
      label: string;
      last_processed_month: string | null;
    }>(
      `SELECT id, amount, deduction_day, label, last_processed_month
       FROM public.lic_deductions
       WHERE LOWER(user_id) = $1 AND is_active = TRUE`,
      [targetUser]
    );

    const processed: string[] = [];

    for (const ded of deductionsRes.rows) {
      const lastMonth = ded.last_processed_month;
      // Already processed this month - skip
      if (lastMonth === currentMonth) continue;

      // Check if today is on or after the deduction day this month
      if (todayDay >= Number(ded.deduction_day)) {
        // Insert a family_money transaction as "sent" Online for this deduction
        await query(
          `INSERT INTO public.family_money 
            (user_id, transaction_date, transaction_type, person_name, amount, payment_mode, reason)
           VALUES ($1, $2, 'sent', 'LIC', $3, 'Online', $4)`,
          [targetUser, todayStr, Number(ded.amount), `${ded.label} - Auto Deduction`]
        );

        // Mark as processed for this month
        await query(
          `UPDATE public.lic_deductions SET last_processed_month = $1, updated_at = NOW() WHERE id = $2`,
          [currentMonth, ded.id]
        );

        processed.push(ded.label);
      }
    }

    return NextResponse.json({ processed, message: processed.length > 0 ? `Processed: ${processed.join(', ')}` : 'Nothing to process' });
  } catch (error: any) {
    console.error('Process LIC deductions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
