import { getPool, closePool } from '../lib/db.js';
import { chunkText } from '../lib/chunk.js';
import { embedText } from '../lib/bedrock.js';

async function upsertDoc(pool: any, sourceType: string, sourceId: number | null, title: string | null, content: string) {
  const { rows } = await pool.query(
    `INSERT INTO documents (source_type, source_id, title, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [sourceType, sourceId, title, content],
  );
  return rows[0].id as number;
}

async function insertChunk(pool: any, docId: number, index: number, content: string, embedding: number[]) {
  const vectorStr = `[${embedding.join(',')}]`;
  await pool.query(
    `INSERT INTO chunks (doc_id, chunk_index, content, embedding)
     VALUES ($1, $2, $3, $4::vector)`,
    [docId, index, content, vectorStr],
  );
}

function notesToString(notes: string[] | null): string {
  if (!notes || notes.length === 0) return '';
  return `フレーバーノート: ${notes.join(', ')}`;
}

async function buildBeanDocs(pool: any) {
  const beans = await pool.query(
    `SELECT id, name, roaster, origin, process, roast_level, flavor_notes, description
     FROM beans ORDER BY id`,
  );
  console.log(`Found ${beans.rowCount} beans.`);
  for (const b of beans.rows) {
    const title = `Bean: ${b.name}${b.roaster ? ` (${b.roaster})` : ''}`;
    const parts = [
      b.description?.trim() || '',
      notesToString(b.flavor_notes),
      `産地: ${b.origin || '不明'}`,
      `精製: ${b.process || '不明'}`,
      `焙煎度: ${b.roast_level || '不明'}`,
    ].filter(Boolean);
    const content = parts.join('\n');
    if (!content) continue;
    const docId = await upsertDoc(pool, 'bean', b.id, title, content);
    const chunks = chunkText(content, 800);
    let idx = 0;
    for (const c of chunks) {
      const emb = await embedText(c);
      await insertChunk(pool, docId, idx++, c, emb);
    }
    console.log(`Bean doc created: id=${docId}, chunks=${chunks.length}`);
  }
}

async function main() {
  const pool = getPool();
  try {
    await buildBeanDocs(pool);
  } finally {
    await closePool(pool);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

