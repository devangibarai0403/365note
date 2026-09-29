const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL database');

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Current public tables:', tablesRes.rows.map(r => r.table_name));

  // Let's create our schema
  const schemaSql = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. App Users / Profiles
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'devangi', 'shrikesh'
      display_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL, -- 'admin', 'devangi', 'shrikesh'
      pin_code VARCHAR(10) NOT NULL DEFAULT '1234', -- Quick secure PIN or password for easy mobile/desktop access
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Insert default 3 users if not present
    INSERT INTO public.users (username, display_name, role, pin_code)
    VALUES 
      ('admin', 'Admin', 'admin', '3725'),
      ('devangi', 'Devangi', 'devangi', '1111'),
      ('shrikesh', 'Shrikesh', 'shrikesh', '2222')
    ON CONFLICT (username) DO NOTHING;

    -- 2. Classes (Defined and managed by Admin)
    CREATE TABLE IF NOT EXISTS public.classes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) UNIQUE NOT NULL,
      hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 2b. Class Subjects (Multiple subjects per class with individual hourly rates)
    CREATE TABLE IF NOT EXISTS public.class_subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
      subject_name VARCHAR(150) NOT NULL,
      hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_class_subject UNIQUE (class_id, subject_name)
    );

    CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON public.class_subjects(class_id);

    -- 3. Class Records (Daily class entries by Devangi or Excel imports)
    -- Hourly rate at the time of entry MUST be frozen and stored!
    CREATE TABLE IF NOT EXISTS public.class_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
      class_name VARCHAR(150) NOT NULL,
      subject_id UUID REFERENCES public.class_subjects(id) ON DELETE SET NULL,
      subject_name VARCHAR(150),
      record_date DATE NOT NULL,
      from_time VARCHAR(20) NOT NULL, -- e.g. "05:00 PM"
      to_time VARCHAR(20) NOT NULL,   -- e.g. "07:00 PM"
      hours NUMERIC(6, 2) NOT NULL,
      hourly_rate NUMERIC(10, 2) NOT NULL,
      total_amount NUMERIC(10, 2) NOT NULL,
      notes TEXT,
      imported_from_excel BOOLEAN NOT NULL DEFAULT FALSE,
      created_by VARCHAR(50) NOT NULL DEFAULT 'devangi',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 4. Schools (Managed by Admin for Devangi)
    CREATE TABLE IF NOT EXISTS public.schools (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      monthly_salary NUMERIC(12, 2) DEFAULT 0.00,
      joining_date DATE,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 5. School Documents (Offer Letter, Joining Letter, etc. stored on Vercel Blob)
    CREATE TABLE IF NOT EXISTS public.school_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      document_title VARCHAR(200) NOT NULL,
      document_type VARCHAR(100), -- 'Offer Letter', 'Joining Letter', 'Other'
      file_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 6. School Daily Status (Devangi's attendance: Working, Leave by School, Leave taken by You)
    CREATE TABLE IF NOT EXISTS public.school_daily_status (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
      status_date DATE NOT NULL,
      status VARCHAR(30) NOT NULL CHECK (status IN ('working', 'leave_by_school', 'leave_taken')),
      user_id VARCHAR(50) NOT NULL DEFAULT 'devangi',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_school_date_status UNIQUE (school_id, status_date)
    );

    -- 7. Office (Managed by Admin for Shrikesh)
    CREATE TABLE IF NOT EXISTS public.office (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_name VARCHAR(200) NOT NULL DEFAULT 'Main Office',
      location VARCHAR(200),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Ensure at least one office entry exists
    INSERT INTO public.office (company_name, location)
    SELECT 'Main Office', 'HQ'
    WHERE NOT EXISTS (SELECT 1 FROM public.office);

    -- 8. Office Daily Status (Shrikesh's attendance: Working, Leave by Office, Leave taken by You)
    CREATE TABLE IF NOT EXISTS public.office_daily_status (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      office_id UUID REFERENCES public.office(id) ON DELETE CASCADE,
      status_date DATE NOT NULL,
      status VARCHAR(30) NOT NULL CHECK (status IN ('working', 'leave_by_office', 'leave_taken')),
      user_id VARCHAR(50) NOT NULL DEFAULT 'shrikesh',
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_office_date_status UNIQUE (status_date)
    );

    -- 9. Daily Kharcha (Expenses for both Devangi and Shrikesh)
    CREATE TABLE IF NOT EXISTS public.daily_kharcha (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(50) NOT NULL, -- 'devangi' or 'shrikesh'
      expense_date DATE NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      spent_on TEXT NOT NULL,
      payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('Cash', 'Online')),
      category VARCHAR(50) DEFAULT 'General',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 10. Family Money Transactions
    CREATE TABLE IF NOT EXISTS public.family_money (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(50) NOT NULL, -- 'devangi' or 'shrikesh'
      transaction_date DATE NOT NULL,
      transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('received', 'sent')),
      person_name VARCHAR(100) NOT NULL, -- For Devangi: 'Papa', 'Chetna', 'Dhaval', 'Mummy', 'Others'
                                         -- For Shrikesh: 'Amma', 'Shrivas', 'Shriraj', 'Others', or Family
      amount NUMERIC(12, 2) NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 11. Admin Calendar Notes
    CREATE TABLE IF NOT EXISTS public.admin_calendar_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      note_date DATE NOT NULL,
      title VARCHAR(200),
      note TEXT NOT NULL,
      tag VARCHAR(50) DEFAULT 'General', -- 'Meeting', 'Payment', 'Reminder', 'Holiday', 'Personal', 'Follow-up'
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Indexing for blazing performance on date queries and role filtering
    CREATE INDEX IF NOT EXISTS idx_class_records_date ON public.class_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_school_status_date ON public.school_daily_status(status_date);
    CREATE INDEX IF NOT EXISTS idx_office_status_date ON public.office_daily_status(status_date);
    CREATE INDEX IF NOT EXISTS idx_kharcha_user_date ON public.daily_kharcha(user_id, expense_date);
    CREATE INDEX IF NOT EXISTS idx_family_money_user_date ON public.family_money(user_id, transaction_date);
    CREATE INDEX IF NOT EXISTS idx_admin_notes_date ON public.admin_calendar_notes(note_date);
  `;

  await client.query(schemaSql);
  console.log('Database tables, constraints, and indexes successfully initialized!');

  // Seed sample classes if empty
  const classesCount = await client.query('SELECT COUNT(*) FROM public.classes;');
  if (parseInt(classesCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO public.classes (name, hourly_rate, description)
      VALUES 
        ('Maths', 500.00, 'Mathematics high school & competitive'),
        ('Physics', 600.00, 'Physics conceptual & numericals'),
        ('Chemistry', 550.00, 'Organic & Inorganic Chemistry');
    `);
    console.log('Seeded initial sample classes (Maths, Physics, Chemistry)');
  }

  // Seed sample school if empty
  const schoolsCount = await client.query('SELECT COUNT(*) FROM public.schools;');
  if (parseInt(schoolsCount.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO public.schools (name, monthly_salary, joining_date, notes)
      VALUES 
        ('St. Xavier High School', 45000.00, '2024-06-15', 'Primary teaching role');
    `);
    console.log('Seeded initial sample school');
  }

  const finalTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Final public tables:', finalTables.rows.map(r => r.table_name));

  await client.end();
}

main().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
