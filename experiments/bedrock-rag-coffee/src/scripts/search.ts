import { getPool, closePool } from '../lib/db.js';
import { embedText } from '../lib/bedrock.js';

async function main() {
  const q = process.argv.slice(2).join(' ').trim();
  if (!q) {
    console.error('Usage: pnpm search <query>');
    process.exit(1);
  }
  const pool = getPool();
  try {
    const qvec = await embedText(q);
    const vstr = `[${qvec.join(',')}]`;
    const { rows } = await pool.query(
      `SELECT d.id as doc_id, d.title, c.chunk_index, c.content,
              (c.embedding <=> $1::vector) AS distance
       FROM chunks c
       JOIN documents d ON d.id = c.doc_id
       ORDER BY c.embedding <=> $1::vector
       LIMIT 10`,
      [vstr],
    );
    for (const r of rows) {
      console.log(`doc=${r.doc_id} #${r.chunk_index} dist=${r.distance.toFixed(4)} title=${r.title}`);
      console.log(r.content.slice(0, 200).replace(/\s+/g, ' ') + (r.content.length > 200 ? '...' : ''));
      console.log('---');
    }
  } finally {
    await closePool(pool);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

