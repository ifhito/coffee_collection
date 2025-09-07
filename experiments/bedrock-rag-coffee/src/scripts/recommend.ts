import { getPool, closePool } from '../lib/db.js';
import { embedText, generateWithClaude } from '../lib/bedrock.js';
import { buildSystemPrompt, buildUserPrompt } from '../lib/prompt.js';

async function main() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    console.error('Usage: pnpm recommend "酸味控えめでチョコ系の風味が好き"');
    process.exit(1);
  }
  const pool = getPool();
  try {
    const qvec = await embedText(query);
    const vstr = `[${qvec.join(',')}]`;
    const { rows } = await pool.query(
      `SELECT d.id as doc_id, d.title, c.chunk_index, c.content,
              (c.embedding <=> $1::vector) AS distance
       FROM chunks c
       JOIN documents d ON d.id = c.doc_id
       ORDER BY c.embedding <=> $1::vector
       LIMIT 16`,
      [vstr],
    );
    const contexts = rows.map((r: any) => ({ title: r.title as string | undefined, content: r.content as string }));

    const sys = buildSystemPrompt();
    const user = buildUserPrompt(query, contexts);
    const answer = await generateWithClaude(sys, user, 800);

    // persist minimal log
    const candidates = rows.slice(0, 8).map((r: any) => ({ doc_id: r.doc_id, chunk_index: r.chunk_index, distance: Number(r.distance) }));
    await pool.query(
      `INSERT INTO rec_logs (user_id, query_text, query_filters, model, top_k, candidates, response_text, cost_estimate)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb)`,
      [null, query, null, 'claude-3-sonnet', 16, JSON.stringify(candidates), answer, null],
    );

    console.log('--- Recommendation ---');
    console.log(answer.trim());
  } finally {
    await closePool(pool);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
