const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // 1. Check current devangi balance
  const balRes = await client.query("SELECT * FROM public.user_balances WHERE user_id = 'devangi'");
  console.log('Devangi initial balance:', balRes.rows[0]);

  // 2. Query class records for 2026-10
  const records = await client.query(`
    SELECT class_name, COUNT(*) as cnt, SUM(hours) as hours, SUM(total_amount) as total
    FROM public.class_records
    WHERE record_date >= '2026-10-01' AND record_date <= '2026-10-31'
    GROUP BY class_name
  `);
  console.log('\n2026-10 Monthly Class Records:');
  console.table(records.rows);

  // 3. Query existing payments (should be 0 right now)
  const pays = await client.query("SELECT * FROM public.class_payments");
  console.log('\nCurrent Class Payments count:', pays.rows.length);

  await client.end();
}

main().catch(console.error);
