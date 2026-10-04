const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const count = await client.query('SELECT COUNT(*) FROM public.class_records');
  console.log('Total Class Records:', count.rows[0].count);

  const byClass = await client.query(`
    SELECT class_name, subject_name, COUNT(*) as sessions, SUM(hours) as hours, SUM(total_amount) as total_earnings
    FROM public.class_records
    GROUP BY class_name, subject_name
    ORDER BY class_name, subject_name
  `);
  console.table(byClass.rows);

  const total = await client.query(`
    SELECT SUM(hours) as grand_hours, SUM(total_amount) as grand_earnings FROM public.class_records
  `);
  console.table(total.rows);

  await client.end();
}

check().catch(console.error);
