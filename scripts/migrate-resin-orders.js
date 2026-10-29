const { Client } = require('pg');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/POSTGRES_URL="?([^"\n]+)"?/);
const connStr = match ? match[1] : '';

const client = new Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  console.log('Altering resin_orders table...');
  await client.query(`
    DROP INDEX IF EXISTS public.idx_resin_orders_order_no;
    ALTER TABLE public.resin_orders DROP COLUMN IF EXISTS order_no CASCADE;
    ALTER TABLE public.resin_orders DROP COLUMN IF EXISTS product_name CASCADE;
    ALTER TABLE public.resin_orders DROP COLUMN IF EXISTS images CASCADE;
    ALTER TABLE public.resin_orders DROP COLUMN IF EXISTS notes CASCADE;
  `);

  console.log('Querying updated columns in resin_orders...');
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'resin_orders'
    ORDER BY ordinal_position;
  `);
  console.table(res.rows);

  await client.end();
  console.log('Migration completed successfully!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

