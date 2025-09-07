import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';
import { config } from './config.js';

export function getPool() {
  return new Pool({
    host: config.rds.host,
    port: config.rds.port,
    database: config.rds.database,
    user: config.rds.user,
    password: config.rds.password,
    ssl: false,
  });
}

export async function runSchema(pool: Pool) {
  const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

export async function closePool(pool: Pool) {
  await pool.end();
}

