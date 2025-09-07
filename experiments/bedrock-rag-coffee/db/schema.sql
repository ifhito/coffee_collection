-- PostgreSQL + pgvector schema for coffee RAG POC

CREATE EXTENSION IF NOT EXISTS vector;

-- Core domain
CREATE TABLE IF NOT EXISTS beans (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  roaster       TEXT,
  origin        TEXT,
  process       TEXT,
  roast_level   TEXT, -- light/medium/dark etc.
  flavor_notes  TEXT[],
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beans_roaster ON beans (roaster);
CREATE INDEX IF NOT EXISTS idx_beans_origin  ON beans (origin);
CREATE INDEX IF NOT EXISTS idx_beans_roast   ON beans (roast_level);

CREATE TABLE IF NOT EXISTS brews (
  id            BIGSERIAL PRIMARY KEY,
  bean_id       BIGINT NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
  method        TEXT,
  dose_g        NUMERIC,
  ratio         NUMERIC,
  water_temp_c  NUMERIC,
  brew_time_s   INTEGER,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brews_bean ON brews (bean_id);

CREATE TABLE IF NOT EXISTS tastings (
  id            BIGSERIAL PRIMARY KEY,
  brew_id       BIGINT NOT NULL REFERENCES brews(id) ON DELETE CASCADE,
  user_id       TEXT,
  liking        INTEGER, -- 1..5
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tastings_brew ON tastings (brew_id);

-- RAG logical docs and chunks
CREATE TABLE IF NOT EXISTS documents (
  id            BIGSERIAL PRIMARY KEY,
  source_type   TEXT NOT NULL, -- bean|brew|tasting|summary
  source_id     BIGINT,        -- nullable for aggregated summaries
  title         TEXT,
  content       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Choose embedding dimension to match Titan G1 Text (e.g., 1536)
CREATE TABLE IF NOT EXISTS chunks (
  id            BIGSERIAL PRIMARY KEY,
  doc_id        BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  embedding     vector(1536) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks (doc_id);
-- IVF index requires ANALYZE and row count; create once data exists
-- Example: CREATE INDEX idx_chunks_emb_ivf ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- User preference (optional)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id       TEXT PRIMARY KEY,
  profile       JSONB,
  pref_vector   vector(1536)
);

-- Recommendation logs
CREATE TABLE IF NOT EXISTS rec_logs (
  id             BIGSERIAL PRIMARY KEY,
  user_id        TEXT,
  query_text     TEXT,
  query_filters  JSONB,
  model          TEXT,
  top_k          INTEGER,
  candidates     JSONB, -- [{doc_id, score}]
  response_text  TEXT,
  cost_estimate  JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);

