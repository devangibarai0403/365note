const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres.eseuvwggoopvyttwyqoq:ourtracker@3725@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await client.connect();
  const res = await client.query(`
    UPDATE public.resin_orders 
    SET order_no = REPLACE(order_no, 'DRSIIN', 'DRSIN')
    WHERE order_no LIKE 'DRSIIN%'
    RETURNING order_no;
  `);
  console.log('Updated orders:', res.rows);
  await client.end();
}

migrate().catch(console.error);
