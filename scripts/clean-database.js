const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function cleanDatabase() {
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  // List of tables to truncate (all tables except 'users')
  const tablesToClean = [
    'class_records',
    'class_subjects',
    'classes',
    'school_documents',
    'school_daily_status',
    'schools',
    'office_daily_status',
    'office',
    'daily_kharcha',
    'family_money',
    'admin_calendar_notes'
  ];

  console.log('--- BEFORE CLEANUP ---');
  for (const table of tablesToClean) {
    const res = await client.query(`SELECT COUNT(*) FROM public."${table}"`);
    console.log(`${table}: ${res.rows[0].count} rows`);
  }
  const userRes = await client.query('SELECT COUNT(*) FROM public.users');
  console.log(`users (TO BE KEPT): ${userRes.rows[0].count} rows`);

  console.log('\nCleaning tables...');
  const truncateQuery = `TRUNCATE TABLE ${tablesToClean.map(t => `public."${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
  await client.query(truncateQuery);

  // Re-seed default office record so office tracking works out-of-the-box
  await client.query(`
    INSERT INTO public.office (company_name, location)
    VALUES ('Main Office', 'HQ');
  `);

  console.log('\n--- AFTER CLEANUP ---');
  for (const table of tablesToClean) {
    const res = await client.query(`SELECT COUNT(*) FROM public."${table}"`);
    console.log(`${table}: ${res.rows[0].count} rows`);
  }
  const afterUsers = await client.query('SELECT id, username, display_name, role FROM public.users');
  console.log(`users: ${afterUsers.rows.length} rows`);
  console.table(afterUsers.rows);

  await client.end();
  console.log('\nCleanup completed successfully!');
}

cleanDatabase().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
