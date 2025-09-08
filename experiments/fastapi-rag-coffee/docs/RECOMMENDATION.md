# 推薦ロジック解説（FastAPI RAG Coffee）

本ドキュメントは、本PoCにおけるコーヒー豆レコメンド（RAG）の処理フローと主要な実装ポイントをまとめたものです。

## 全体像

- 検索対象: `documents/chunks`（`beans`行から生成した論理ドキュメントをチャンク化し埋め込み）
- 埋め込み/生成モデル: AWS Bedrock を Lambda 経由で呼び出し
- 近傍検索: PostgreSQL + pgvector（コサイン距離 `<=>`）
- 重複除去: 同一ドキュメント内の最良チャンクのみ採用（ROW_NUMBERでrn=1）
- 応答: 推薦文（日本語）+ 参照コンテキスト（番号付き）

## 推薦フロー（Mermaid）

```mermaid
flowchart TD
  A[ユーザー入力: クエリ] --> B[クエリ埋め込み生成<br/>Lambda→Bedrock(action=embed)]
  B --> C[ベクトル検索(pgvector)<br/>chunks.embedding に対し KNN]
  C --> D[ドキュメント単位で重複除去<br/>ROW_NUMBER rn=1]
  D --> E[プロンプト生成<br/>system + user(context #1..#K)]
  E --> F[生成API呼出<br/>Lambda→Bedrock(action=generate, JSON応答)]
  F --> G[応答(JSON)返却]
  F --> H[推薦ログ保存(rec_logs)]

  subgraph FastAPI
    A
    C
    D
    E
    G
    H
  end

  subgraph Lambda_Proxy
    B
    F
  end

  subgraph PostgreSQL
    C
  end
```

## ドキュメント生成フロー（Mermaid）

```mermaid
flowchart LR
  X[beansテーブル] --> Y[論理ドキュメント生成<br/>タイトル/説明/フレーバー等を結合]
  Y --> Z[chunkText(最大800文字)]
  Z --> E1[各チャンクをembed<br/>Lambda→Bedrock(action=embed)]
  E1 --> I[documents/chunksへINSERT]
```

- 実装: `POST /documents/build`（`app/main.py`）
- チャンク分割: `app/utils.py: chunk_text()`（日本語の句読点やピリオド付近で折り返し）

## 近傍検索と重複除去（SQL）

- クエリ例（`/search` / `/recommend` で共通）

```sql
WITH scored AS (
  SELECT d.id AS doc_id,
         d.title,
         c.chunk_index,
         c.content,
         (c.embedding <=> $1::vector) AS distance,
         ROW_NUMBER() OVER (PARTITION BY d.id ORDER BY c.embedding <=> $1::vector) AS rn
  FROM chunks c
  JOIN documents d ON d.id = c.doc_id
)
SELECT doc_id, title, chunk_index, content, distance
FROM scored
WHERE rn = 1
ORDER BY distance
LIMIT $2;
```

- ポイント
  - 埋め込み次元はテーブルとモデルで一致必須（例: Titan v2=1024, Titan v1=1536）。
  - 距離はコサイン距離演算子 `<=>`。
  - ドキュメント単位で最良チャンクのみ採用（`ROW_NUMBER`で`rn=1`）。

## Bedrock呼び出し（Lambdaプロキシ）

- embed: 常にJSON（`{"embedding":[…]}`）を返却
- generate: デフォルトは`text/plain`だが、次のいずれかでJSONを返す
  - Acceptヘッダに`application/json`
  - ボディに`"json": true`
- クライアント（`app/bedrock_client.py`）
  - embed/generateともにHTTPエラー・非JSON応答を詳細化して例外に変換
  - generate呼出時は`Accept: application/json` + `"json": true`で`{"text":"…","raw":{…}}`を取得

## プロンプト構成

- system: バリスタとして日本語で簡潔かつ根拠付きの推薦を指示
- user: 条件とコンテキスト（`#1..#K`）を付与し、最大3件・各150文字程度・参考番号付きで回答を要求
- 返却: APIはプロンプトに渡したコンテキストを`ref`番号付きで全件返すため、(参考: #N) と対応が取れます

## インデックス最適化（推奨）

- データが増える場合はivfflatを作成（作成後にANALYZE）

```sql
CREATE INDEX IF NOT EXISTS idx_chunks_emb_ivf
ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
ANALYZE chunks;
```

- 注意: ivfflatは近似検索。再現性や精度が必要なら`lists`調整や`HNSW`(pgvector v0.7+)の検討

## エラー/品質のよくある原因と対策

- 埋め込み次元不一致: `expected 1024 dimensions, not 1536` → テーブル次元 or モデルを合わせる
- 参照番号とcontexts不一致: 上位5件のみ表示だとズレる → 全件に`ref`を付けて返却（本実装は対応済）
- コンテキスト重複: 同一ドキュメントの複数チャンクが上位にくる → `ROW_NUMBER`で重複除去（対応済）
- 用語のズレ: “桜”などがデータに無い → `floral/flower/jasmine`等の語彙に寄せた表現でデータ・クエリを整備

## パラメータ

- `top_k`（既定16）: コンテキストの取得件数（重複除去後）
- `MAX_TOKENS`（既定800）: 生成の最大トークン数
- 埋め込みモデル/次元: Lambdaの`EMBEDDING_MODEL_ID`とDBの`vector(N)`を一致

## エンドポイント対応

- `POST /documents/build`:
  - `beans`→`documents/chunks`を再構築（チャンクごとにembedしてDB保存）
- `GET /search?query=...&k=10`:
  - クエリ埋め込み→KNN→文書単位で重複除去→上位kを返却
- `POST /recommend {query, top_k?}`:
  - クエリ埋め込み→KNN（重複除去）→プロンプト生成→生成→応答+contexts(ref付き)

---

必要に応じて、再ランキング（フレーバーノートに基づく加点）や、プロンプト制約強化（コンテキスト外の記述禁止）なども提案できます。
