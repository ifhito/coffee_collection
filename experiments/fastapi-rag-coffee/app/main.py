from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel

from .settings import settings
from .db import get_conn, apply_schema
from .bedrock_client import bedrock
from .utils import chunk_text
from .prompt import build_system_prompt, build_user_prompt


app = FastAPI(title="FastAPI RAG Coffee")


class RecommendRequest(BaseModel):
    query: str
    top_k: int = 16


@app.get("/health")
def health():
    return {"status": "ok", "lambda": bool(bedrock), "db": True}


@app.post("/init-db")
def init_db():
    apply_schema()
    return {"ok": True}


@app.post("/documents/build")
def build_documents():
    if not bedrock:
        return {"ok": False, "error": "LAMBDA_API_URL not configured"}
    conn = get_conn()
    created_docs = 0
    created_chunks = 0
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, roaster, origin, process, roast_level, flavor_notes, description
            FROM beans ORDER BY id
            """
        )
        beans = cur.fetchall()

    for b in beans:
        # rows are tuples (psycopg3 default) or dicts (psycopg2 RealDictCursor)
        if isinstance(b, dict):
            bid = b.get("id"); name = b.get("name"); roaster = b.get("roaster")
            origin = b.get("origin"); process = b.get("process"); roast = b.get("roast_level")
            notes = b.get("flavor_notes") or []
            desc = b.get("description") or ""
        else:
            bid, name, roaster, origin, process, roast, notes, desc = (
                b[0], b[1], b[2], b[3], b[4], b[5], b[6] or [], b[7] or ""
            )
        roaster_sfx = f" ({roaster})" if roaster else ""
        title = f"Bean: {name}{roaster_sfx}"
        parts = [
            (desc or "").strip(),
            f"フレーバーノート: {', '.join(notes)}" if notes else "",
            f"産地: {origin or '不明'}",
            f"精製: {process or '不明'}",
            f"焙煎度: {roast or '不明'}",
        ]
        content = "\n".join([p for p in parts if p]).strip()
        if not content:
            continue
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO documents (source_type, source_id, title, content)
                VALUES ('bean', %s, %s, %s)
                RETURNING id
                """,
                (bid, title, content),
            )
            row = cur.fetchone()
            doc_id = row[0] if not isinstance(row, dict) else row.get("id")
        created_docs += 1

        chunks = chunk_text(content, 800)
        for idx, c in enumerate(chunks):
            emb = bedrock.embed(c)
            vector_str = "[" + ",".join(str(x) for x in emb) + "]"
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO chunks (doc_id, chunk_index, content, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    """,
                    (doc_id, idx, c, vector_str),
                )
            created_chunks += 1

    return {"ok": True, "docs": created_docs, "chunks": created_chunks}


@app.get("/search")
def search(query: str = Query(...), k: int = Query(10, ge=1, le=50)):
    if not bedrock:
        return {"ok": False, "error": "LAMBDA_API_URL not configured"}
    qvec = bedrock.embed(query)
    vstr = "[" + ",".join(str(x) for x in qvec) + "]"
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            WITH scored AS (
              SELECT d.id AS doc_id,
                     d.title,
                     c.chunk_index,
                     c.content,
                     (c.embedding <=> %s::vector) AS distance,
                     ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY c.embedding <=> %s::vector) AS rn
              FROM chunks c
              JOIN documents d ON d.id = c.doc_id
            )
            SELECT doc_id, title, chunk_index, content, distance
            FROM scored
            WHERE rn = 1
            ORDER BY distance
            LIMIT %s
            """,
            (vstr, vstr, k),
        )
        rows = cur.fetchall()
    results = []
    for r in rows:
        if isinstance(r, dict):
            results.append({
                "doc_id": r["doc_id"],
                "title": r["title"],
                "chunk_index": r["chunk_index"],
                "distance": float(r["distance"]),
                "content": r["content"],
            })
        else:
            results.append({
                "doc_id": r[0],
                "title": r[1],
                "chunk_index": r[2],
                "distance": float(r[4]),
                "content": r[3],
            })
    return {"ok": True, "results": results}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    if not bedrock:
        return {"ok": False, "error": "LAMBDA_API_URL not configured"}
    q = req.query.strip()
    if not q:
        return {"ok": False, "error": "empty query"}
    top_k = min(max(req.top_k, 1), 32)

    # 1) embed query and fetch neighbors
    qvec = bedrock.embed(q)
    vstr = "[" + ",".join(str(x) for x in qvec) + "]"
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            WITH scored AS (
              SELECT d.id AS doc_id,
                     d.title,
                     c.chunk_index,
                     c.content,
                     (c.embedding <=> %s::vector) AS distance,
                     ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY c.embedding <=> %s::vector) AS rn
              FROM chunks c
              JOIN documents d ON d.id = c.doc_id
            )
            SELECT doc_id, title, chunk_index, content, distance
            FROM scored
            WHERE rn = 1
            ORDER BY distance
            LIMIT %s
            """,
            (vstr, vstr, top_k),
        )
        rows = cur.fetchall()

    contexts = []
    for r in rows:
        if isinstance(r, dict):
            contexts.append({"title": r["title"], "content": r["content"]})
        else:
            contexts.append({"title": r[1], "content": r[3]})

    # 2) build prompt and generate
    system = build_system_prompt()
    user = build_user_prompt(q, contexts)
    try:
        answer = bedrock.generate(system, user, settings.max_tokens)
    except Exception as e:
        # Surface upstream error (Lambda/Bedrock) to client for easier debugging in PoC
        raise HTTPException(status_code=502, detail=str(e))

    # 3) log minimal
    candidates = []
    for r in rows[: min(8, len(rows))]:
        if isinstance(r, dict):
            candidates.append({
                "doc_id": r["doc_id"],
                "chunk_index": r["chunk_index"],
                "distance": float(r["distance"]),
            })
        else:
            candidates.append({
                "doc_id": r[0],
                "chunk_index": r[2],
                "distance": float(r[4]),
            })
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO rec_logs (user_id, query_text, model, top_k, candidates, response_text)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s)
            """,
            (None, q, "claude-bedrock", top_k, __import__("json").dumps(candidates), answer),
        )

    # 返却する contexts は、プロンプトに渡した順序で全件返し、ref番号を付与
    contexts_with_ref = [
        {"ref": i + 1, **ctx} for i, ctx in enumerate(contexts)
    ]
    return {"ok": True, "answer": answer, "contexts": contexts_with_ref, "candidates": candidates}
