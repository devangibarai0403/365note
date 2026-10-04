const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkMonthlyData() {
  await client.connect();
  const res = await client.query(`
    SELECT 
      TO_CHAR(record_date, 'YYYY-MM') as month,
      MIN(record_date) as min_date,
      MAX(record_date) as max_date,
      COUNT(*) as count,
      SUM(hours) as total_hours,
      SUM(total_amount) as total_earnings
    FROM public.class_records
    GROUP BY TO_CHAR(record_date, 'YYYY-MM')
    ORDER BY month ASC
  `);
  console.log('--- MONTHLY BREAKDOWN IN DB ---');
  console.table(res.rows);

  const sample = await client.query(`
    SELECT id, class_name, subject_name, TO_CHAR(record_date, 'YYYY-MM-DD') as date, from_time, to_time, hours, hourly_rate, total_amount 
    FROM public.class_records 
    ORDER BY record_date ASC 
    LIMIT 10
  `);
  console.log('Sample rows:');
  console.table(sample.rows);

  const sampleLast = await client.query(`
    SELECT id, class_name, subject_name, TO_CHAR(record_date, 'YYYY-MM-DD') as date, from_time, to_time, hours, hourly_rate, total_amount 
    FROM public.class_records 
    ORDER BY record_date DESC 
    LIMIT 10
  `);
  console.log('Sample last rows:');
  console.table(sampleLast.rows);

  await client.end();
}
checkMonthlyData().catch(console.error);
