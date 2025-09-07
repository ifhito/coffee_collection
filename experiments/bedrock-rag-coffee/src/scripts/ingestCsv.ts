import fs from 'fs';
import { parse } from 'csv-parse';
import { getPool, closePool } from '../lib/db.js';

type BeanRow = {
  id?: string;
  name: string;
  roaster?: string;
  origin?: string;
  process?: string;
  roast_level?: string;
  flavor_notes?: string; // semi-colon separated
  description?: string;
};

async function upsertBean(pool: any, row: BeanRow) {
  const notes = row.flavor_notes
    ? row.flavor_notes
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  await pool.query(
    `INSERT INTO beans (name, roaster, origin, process, roast_level, flavor_notes, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING`,
    [row.name, row.roaster || null, row.origin || null, row.process || null, row.roast_level || null, notes, row.description || null],
  );
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: pnpm ingest:csv <path/to/beans.csv>');
    process.exit(1);
  }
  const pool = getPool();
  try {
    const parser = fs.createReadStream(file).pipe(
      parse({ columns: true, skip_empty_lines: true, trim: true }),
    );
    let count = 0;
    for await (const rec of parser) {
      await upsertBean(pool, rec as BeanRow);
      count++;
    }
    console.log(`Imported beans: ${count}`);
  } finally {
    await closePool(pool);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

