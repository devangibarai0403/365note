const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  await client.connect();
  console.log('Connected to PostgreSQL database');

  await client.query(`
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

    ALTER TABLE public.class_records 
      ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.class_subjects(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS subject_name VARCHAR(150);

    -- Update unique constraint on class_records if needed, to support subjects
    ALTER TABLE public.class_records 
      DROP CONSTRAINT IF EXISTS unique_class_record_entry;

    -- Add index for record lookups
    CREATE INDEX IF NOT EXISTS idx_class_records_class_subject ON public.class_records(class_id, subject_id);
  `);
  console.log('Tables and columns created successfully');

  // Populate subjects for existing classes if none exist yet
  const classesRes = await client.query('SELECT * FROM public.classes');
  console.log(`Found ${classesRes.rows.length} existing classes`);

  for (const cls of classesRes.rows) {
    const existingSubj = await client.query(
      'SELECT id FROM public.class_subjects WHERE class_id = $1',
      [cls.id]
    );

    if (existingSubj.rows.length === 0) {
      // Use existing description as subject name if it looks like a subject (e.g. English, Science, etc.), otherwise 'General'
      const subjectName = (cls.description && cls.description.trim().length > 0 && cls.description.length < 50)
        ? cls.description.trim()
        : 'General';
      const rate = Number(cls.hourly_rate) || 500;

      await client.query(
        `INSERT INTO public.class_subjects (class_id, subject_name, hourly_rate, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (class_id, subject_name) DO NOTHING`,
        [cls.id, subjectName, rate, `Initial subject for ${cls.name}`]
      );
      console.log(`Created initial subject '${subjectName}' (₹${rate}/hr) for class '${cls.name}'`);
    }
  }

  const finalSubjects = await client.query(`
    SELECT cs.id, cs.subject_name, cs.hourly_rate, c.name as class_name 
    FROM public.class_subjects cs
    JOIN public.classes c ON c.id = cs.class_id
    ORDER BY c.name, cs.subject_name
  `);
  console.log('Current class subjects:', finalSubjects.rows);

  await client.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
