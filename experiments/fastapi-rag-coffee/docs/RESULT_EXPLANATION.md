# 推薦API 応答の読み方（contexts と candidates）

このドキュメントは、`POST /recommend` の応答に含まれる `answer` / `contexts` / `candidates` の意味と関係性、数値の解釈方法をまとめたものです。

## 応答の構造
- `ok`: 成功フラグ（true/false）
- `answer`: 生成モデル（Bedrock経由）が日本語で出力した最終的な推薦文
- `contexts`: レコメンド時にプロンプトへ渡したコンテキスト一覧
  - `ref`: 1始まりの連番（順位）。小さいほど類似度が高い（距離が小さい）
  - `title` / `content`: 参照に用いた文脈（ドキュメント単位で重複除去済み）
- `candidates`: 上位候補のサマリ（ログ・検証用）。`contexts` と同じ順（距離の昇順）で先頭8件のみを抜粋
  - `doc_id`: 参照ドキュメントID
  - `chunk_index`: チャンク番号
  - `distance`: ベクトル距離（pgvectorのコサイン距離 `<=>`）→ 数値が小さいほど近い/類似

## 並び順と番号の意味
- 近傍検索の結果は「距離の昇順」で並べます
  - もっとも近い（類似度が高い）ものが先頭
- `contexts` はその並び順に従い `ref = 1..top_k` の番号を付与しています
  - 生成した `answer` に含まれる「(参考: #13,#14)」などの番号は、`contexts` の `ref` と対応します
- `candidates` は同じ並びのうち、先頭8件を抜粋した要約（`distance` を含むので整合確認に便利）

## distance の解釈（pgvector）
- 本PoCはコサイン距離 `<=>` を利用しています
  - 値が小さいほどベクトルが近い（類似）
  - 値が大きいほどベクトルが遠い（非類似）
- 例: 0.38 は 0.42 より近い（関連性が高い）

## 例の読み解き（要旨）
- `answer` の候補に「China Citrus Tea #38」等が出てきており、参考番号として「(参考: #13,#14)」が記述されています
- `contexts` を見ると、`ref: 13` と `ref: 14` にそれぞれ「Bean: China Citrus Tea #38 (Beta Roasters)」があり、これらが根拠として参照されたことが分かります
- `candidates` の並びも `contexts` と同じで、先頭8件のみが `distance` 付きで記録されています（`ref: 1..8` に対応）

## 「数値が大きい方が類似？」への回答
- いいえ。`contexts.ref` は「順位（1が最上位）」、`candidates.distance` は「距離（小さいほど近い）」です
- したがって、`ref` は小さいほど類似、`distance` は小さいほど類似です

## 重複が見える場合の理由と対策
- 理由（よくある例）
  - 同一内容のドキュメントが複数存在（再ビルド時に重複INSERT）
  - 同一ドキュメント内の複数チャンクが上位に来る
- 本PoCでは検索時に「ドキュメント単位で最良チャンクのみ」を残すSQL（`ROW_NUMBER() OVER (PARTITION BY doc_id ...) WHERE rn=1`）を適用済み
- それでも見かけ上の重複が残るときは、以下を検討してください
  - ドキュメント生成時の重複防止（`documents` に UNIQUE 制約を付与し `UPSERT` 化）
  - タイトルや内容ハッシュでのさらなるグルーピング

## 品質向上のヒント
- インデックス最適化
  - `ivfflat` を作成し `ANALYZE` を実行
  - 例:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_chunks_emb_ivf
    ON chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
    ANALYZE chunks;
    ```
- 用語のそろえ方
  - 「桜」などデータにない語は `floral/jasmine` などの語彙に言い換えると検索が安定
- 次元整合
  - DBの `vector(N)` と埋め込みモデルの次元が一致していることを必ず確認

---

質問があれば、このファイルに追記する形でナレッジ化していきます。

