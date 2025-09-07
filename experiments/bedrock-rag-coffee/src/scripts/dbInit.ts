import { getPool, runSchema, closePool } from '../lib/db.js';

async function main() {
  const pool = getPool();
  try {
    console.log('Applying schema...');
    await runSchema(pool);
    console.log('Schema applied.');
  } finally {
    await closePool(pool);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

