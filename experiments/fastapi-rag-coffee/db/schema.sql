-- FastAPI RAG Coffee schema (PostgreSQL + pgvector)

CREATE EXTENSION IF NOT EXISTS vector;

-- Core domain
CREATE TABLE IF NOT EXISTS beans (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  roaster       TEXT,
  origin        TEXT,
  process       TEXT,
  roast_level   TEXT,
  flavor_notes  TEXT[],
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beans_roaster ON beans (roaster);
CREATE INDEX IF NOT EXISTS idx_beans_origin  ON beans (origin);
CREATE INDEX IF NOT EXISTS idx_beans_roast   ON beans (roast_level);

-- Logical documents and chunks for RAG
-- EMBEDDING_DIM はアプリ側で動的に扱うためテーブルは最大公約数を前提に定義
-- 下記はデフォルト 1536 を想定（Titan v2）。変更したい場合はDDLを調整してください。
CREATE TABLE IF NOT EXISTS documents (
  id            BIGSERIAL PRIMARY KEY,
  source_type   TEXT NOT NULL, -- bean|brew|tasting|summary
  source_id     BIGINT,
  title         TEXT,
  content       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 既定: 1536 次元（.envのEMBEDDING_DIMと合わせること）
CREATE TABLE IF NOT EXISTS chunks (
  id            BIGSERIAL PRIMARY KEY,
  doc_id        BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(1536) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks (doc_id);

-- Recommendation logs (簡易)
CREATE TABLE IF NOT EXISTS rec_logs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        TEXT,
  query_text     TEXT,
  model          TEXT,
  top_k          INTEGER,
  candidates     JSONB,
  response_text  TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

