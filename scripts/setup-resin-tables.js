const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres.eseuvwggoopvyttwyqoq:ourtracker@3725@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  console.log('Creating resin_orders table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.resin_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name VARCHAR(255) NOT NULL,
      price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cod', 'upi')),
      status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
      order_date DATE DEFAULT CURRENT_DATE,
      created_by VARCHAR(50) DEFAULT 'devangi',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_resin_orders_status ON public.resin_orders(status);
    CREATE INDEX IF NOT EXISTS idx_resin_orders_order_date ON public.resin_orders(order_date);
  `);

  console.log('Creating resin_expenses table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.resin_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      spent_on VARCHAR(255) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('cod', 'upi')),
      expense_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      created_by VARCHAR(50) DEFAULT 'devangi',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_resin_expenses_date ON public.resin_expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_resin_expenses_mode ON public.resin_expenses(payment_mode);
  `);

  console.log('Tables created successfully!');
  await client.end();
}

setup().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
