const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB');

  // Add payment_mode column to family_money if not exists
  await client.query(`
    ALTER TABLE public.family_money 
    ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'Online';
  `);
  console.log('payment_mode column verified in public.family_money');

  // Create user_balances table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.user_balances (
      user_id VARCHAR(50) PRIMARY KEY,
      initial_cash NUMERIC(12,2) DEFAULT 0,
      initial_online NUMERIC(12,2) DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('user_balances table verified');

  // Seed default balances for devangi, shrikesh, admin
  await client.query(`
    INSERT INTO public.user_balances (user_id, initial_cash, initial_online)
    VALUES 
      ('devangi', 0, 0),
      ('shrikesh', 0, 0),
      ('admin', 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  `);
  console.log('Default user_balances seeded');

  const res = await client.query('SELECT * FROM public.user_balances');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
