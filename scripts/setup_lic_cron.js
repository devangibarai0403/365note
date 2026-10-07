const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function setupCron() {
  console.log('1. Creating or replacing process_lic_deductions function...');
  await pool.query(`
    CREATE OR REPLACE FUNCTION public.process_lic_deductions()
    RETURNS TABLE (processed_id uuid, deduction_label text, deduction_amount numeric)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      current_month_str text;
      current_day int;
      today_date date;
      rec RECORD;
    BEGIN
      -- Calculate current date in Indian Standard Time (UTC+5:30) or UTC
      today_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
      current_day := EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Kolkata'))::int;
      current_month_str := TO_CHAR((NOW() AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM');

      FOR rec IN
        SELECT id, user_id, amount, deduction_day, label, last_processed_month
        FROM public.lic_deductions
        WHERE is_active = TRUE
          AND LOWER(user_id) = 'devangi'
          AND (last_processed_month IS NULL OR last_processed_month != current_month_str)
          AND current_day >= deduction_day
      LOOP
        -- Insert into family_money as sent, Online, LIC
        INSERT INTO public.family_money (
          user_id,
          transaction_date,
          transaction_type,
          person_name,
          amount,
          payment_mode,
          reason
        ) VALUES (
          rec.user_id,
          today_date,
          'sent',
          'LIC',
          rec.amount,
          'Online',
          rec.label || ' - Auto Deduction'
        );

        -- Update last_processed_month
        UPDATE public.lic_deductions
        SET last_processed_month = current_month_str,
            updated_at = NOW()
        WHERE id = rec.id;

        processed_id := rec.id;
        deduction_label := rec.label;
        deduction_amount := rec.amount;
        RETURN NEXT;
      END LOOP;
    END;
    $$;
  `);
  console.log('Function public.process_lic_deductions created successfully.');

  console.log('2. Scheduling pg_cron daily job...');
  // Unschedules if already exists to be idempotent
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-lic-deduction') THEN
        PERFORM cron.unschedule('daily-lic-deduction');
      END IF;
    END $$;
  `);

  // Schedule to run every hour at minute 0 (0 * * * *) so it catches the deduction day accurately
  await pool.query(`
    SELECT cron.schedule(
      'daily-lic-deduction',
      '0 * * * *',
      'SELECT public.process_lic_deductions();'
    );
  `);
  console.log('pg_cron job "daily-lic-deduction" scheduled (runs hourly).');

  // Verify cron jobs
  const jobs = await pool.query('SELECT jobid, jobname, schedule, command, active FROM cron.job');
  console.log('Active cron jobs:', jobs.rows);

  await pool.end();
}

setupCron().catch(err => {
  console.error('Error during setup:', err);
  process.exit(1);
});
