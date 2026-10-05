const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  // 1. Update schools table with paid_leaves_days and per_leave_cut
  await client.query(`
    ALTER TABLE public.schools 
      ADD COLUMN IF NOT EXISTS paid_leaves_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS per_leave_cut NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  `);
  console.log('schools table updated with paid_leaves_days and per_leave_cut');

  // 2. Update office table with monthly_salary, paid_leaves_days, and per_leave_cut
  await client.query(`
    ALTER TABLE public.office 
      ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS paid_leaves_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS per_leave_cut NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  `);
  console.log('office table updated with monthly_salary, paid_leaves_days, and per_leave_cut');

  // 3. Update school_daily_status constraint to allow 'half_day'
  // Find check constraint name on school_daily_status
  const schoolConstraints = await client.query(`
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.school_daily_status'::regclass AND contype = 'c';
  `);
  for (const row of schoolConstraints.rows) {
    if (row.conname.includes('status')) {
      await client.query(`ALTER TABLE public.school_daily_status DROP CONSTRAINT IF EXISTS "${row.conname}";`);
      console.log(`Dropped school_daily_status constraint: ${row.conname}`);
    }
  }
  await client.query(`
    ALTER TABLE public.school_daily_status 
      ADD CONSTRAINT school_daily_status_status_check 
      CHECK (status IN ('working', 'leave_by_school', 'leave_taken', 'half_day'));
  `);
  console.log('school_daily_status constraint updated with half_day');

  // 4. Update office_daily_status constraint to allow 'half_day'
  const officeConstraints = await client.query(`
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.office_daily_status'::regclass AND contype = 'c';
  `);
  for (const row of officeConstraints.rows) {
    if (row.conname.includes('status')) {
      await client.query(`ALTER TABLE public.office_daily_status DROP CONSTRAINT IF EXISTS "${row.conname}";`);
      console.log(`Dropped office_daily_status constraint: ${row.conname}`);
    }
  }
  await client.query(`
    ALTER TABLE public.office_daily_status 
      ADD CONSTRAINT office_daily_status_status_check 
      CHECK (status IN ('working', 'leave_by_office', 'leave_taken', 'half_day'));
  `);
  console.log('office_daily_status constraint updated with half_day');

  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
