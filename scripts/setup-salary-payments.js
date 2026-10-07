const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.salary_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(50) NOT NULL,
      type VARCHAR(20) NOT NULL,
      school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
      office_id UUID REFERENCES public.office(id) ON DELETE SET NULL,
      source_name VARCHAR(200) NOT NULL,
      month VARCHAR(7) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      payment_mode VARCHAR(20) NOT NULL DEFAULT 'Online',
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_salary_payments_user_type_month ON public.salary_payments(user_id, type, month);
    CREATE INDEX IF NOT EXISTS idx_salary_payments_user ON public.salary_payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_salary_payments_month ON public.salary_payments(month);
  `);

  console.log('salary_payments table and indexes created successfully!');
  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
