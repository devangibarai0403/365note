const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:ourtracker@3725@db.eseuvwggoopvyttwyqoq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const requiredClasses = [
  {
    name: 'Aero',
    subjects: [
      { name: 'English', rate: 250 }
    ]
  },
  {
    name: 'Foundation Classes',
    subjects: [
      { name: 'Science', rate: 300 }
    ]
  },
  {
    name: 'Nakshatra Classes',
    subjects: [
      { name: 'Science', rate: 300 },
      { name: 'English', rate: 300 },
      { name: 'Writing Skills', rate: 350 }
    ]
  },
  {
    name: 'ScoreUp Academy',
    subjects: [
      { name: 'English', rate: 350 }
    ]
  },
  {
    name: 'Shiksha Niketan Academy',
    subjects: [
      { name: 'English', rate: 350 },
      { name: 'Science', rate: 400 }
    ]
  }
];

async function sync() {
  await client.connect();
  console.log('Connected to PostgreSQL database');

  for (const c of requiredClasses) {
    let clsRes = await client.query('SELECT id, name FROM public.classes WHERE LOWER(name) = LOWER($1)', [c.name]);
    let classId;
    if (clsRes.rows.length === 0) {
      const ins = await client.query('INSERT INTO public.classes (name, hourly_rate) VALUES ($1, $2) RETURNING id', [c.name, c.subjects[0].rate]);
      classId = ins.rows[0].id;
      console.log('Created class:', c.name);
    } else {
      classId = clsRes.rows[0].id;
      console.log('Found existing class:', clsRes.rows[0].name);
    }

    for (const s of c.subjects) {
      await client.query(`
        INSERT INTO public.class_subjects (class_id, subject_name, hourly_rate)
        VALUES ($1, $2, $3)
        ON CONFLICT (class_id, subject_name)
        DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate
      `, [classId, s.name, s.rate]);
      console.log(`  - Synced subject ${s.name} @ ₹${s.rate}/hr`);
    }
  }

  const all = await client.query(`
    SELECT c.name as class_name, cs.subject_name, cs.hourly_rate
    FROM public.classes c
    JOIN public.class_subjects cs ON cs.class_id = c.id
    ORDER BY c.name, cs.subject_name
  `);
  console.log('All classes & subjects in DB:');
  console.table(all.rows);

  await client.end();
}

sync().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
