const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.class_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
      class_name VARCHAR(150) NOT NULL,
      month VARCHAR(7) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      payment_mode VARCHAR(20) NOT NULL DEFAULT 'Online',
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_by VARCHAR(50) NOT NULL DEFAULT 'devangi',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_class_payments_month ON public.class_payments(month);
    CREATE INDEX IF NOT EXISTS idx_class_payments_class_name ON public.class_payments(class_name);
    CREATE INDEX IF NOT EXISTS idx_class_payments_created_by ON public.class_payments(created_by);
  `);

  console.log('class_payments table and indexes created successfully!');
  await client.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
