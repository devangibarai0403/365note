const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('--- TABLE ROW COUNTS ---');
  for (const row of tables.rows) {
    const t = row.table_name;
    const cnt = await client.query(`SELECT count(*) FROM public."${t}"`);
    console.log(`${t}: ${cnt.rows[0].count} rows`);
  }

  console.log('\n--- USERS ---');
  const users = await client.query('SELECT id, username, display_name, role, pin_code FROM public.users');
  console.table(users.rows);

  await client.end();
}

inspect().catch(console.error);
