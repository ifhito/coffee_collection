# Bedrock × RAG × RDS 設計（コーヒー推薦 POC）

目的
- 手元のコーヒーデータ（豆・抽出・テイスティング）をもとに、質問や嗜好に合わせた推薦を返す。
- 既存アプリ（Next.js + Supabase）には影響を与えないよう、別ディレクトリで POC を独立構築。

前提・方針
- LLM/Embedding: AWS Bedrock（Claude 3 Sonnet 推薦生成、Titan Embeddings G1 Text でベクトル化）
- ベクトルストア: RDS PostgreSQL + pgvector（追加サービスを増やさず最小構成）
- データ取り込み: 既存 Supabase のエクスポートから RDS へ ETL（単純な CSV/SQL でも可）
- 非機能: コスト最小（開発は t3.micro + 少量データ）、リージョンは Bedrock 対応（例: ap-northeast-1）

全体アーキテクチャ（概略）
```
+--------------+       Export        +-------------------+
| Next.js App  |  ---> (CSV/SQL) --> |  ETL (local/CLI)  |
| + Supabase   |                     +---------+---------+
+--------------+                               |
                                                v
                                      +-------------------+
                                      | RDS Postgres +    |
                                      |  pgvector         |
                                      +----+---------+----+
                                           |         |
                                Similarity |         | Metadata
                                           v         v
                                     +-----------+  +----------------+
                                     | Retriever |->| Context Assembler|
                                     +-----+-----+  +----------------+
                                           |
                                           v
                                  +-----------------+
                                  | Bedrock (LLM)   |
                                  | Claude 3 Sonnet |
                                  +--------+--------+
                                           |
                                           v
                                      推薦回答/根拠
```

データモデル（RDS PostgreSQL）
- beans: 豆の基本情報（名称、焙煎度、産地、精製、フレーバーノート等）
- brews: 抽出記録（メソッド、粉量、比率、温度、時間、メモ）
- tastings: テイスティング（好き度、味わいメモ）
- documents: 検索対象の論理ドキュメント（主に豆説明やテイスティング要約）
- chunks: documents をチャンク化したテキスト + embedding（pgvector）
- user_preferences: ユーザー嗜好のプロファイル（任意、将来的に活用）
- rec_logs: 推薦リクエスト/レスポンスのログ（監査・再現性）

インデックス/拡張
- pgvector 拡張を有効化し、`chunks(embedding)` に ivfflat などのインデックスを作成
- メタデータ検索用に beans の主要列にインデックス

主要フロー
1) 取り込み（Ingestion）
   - Supabase 側から beans/brews/tastings を CSV などでエクスポート
   - シンプルなスクリプトで RDS にロード（UPSERT）
   - 推薦対象テキストを生成（例: 豆説明 + テイスティング要約）し、Titan Embeddings で埋め込み → chunks に保存
2) クエリ（Retrieval + Generation）
   - ユーザー質問/嗜好からクエリベクトル生成（Titan Embeddings）
   - pgvector の近傍検索で Top-k を取得（必要に応じてメタデータフィルタ）
   - 取得チャンクと関連メタデータ（豆情報/テイスティング要約）を文脈として Claude 3 Sonnet にプロンプト
   - 推薦結果（複数候補 + 理由 + 参考コンテキスト）を返却

プロンプト設計（要点）
- システム: コーヒーのプロ向けバリスタ兼キュレーターとして、根拠に基づく推薦を日本語で返答
- コンテキスト: 取得チャンク（テイスティング傾向、フレーバー、抽出設定の成功例 など）
- 指示: ユーザー条件（例: 酸味低め/チョコ系、浅煎りは避ける、ドリップ）に合致する 3 件を推薦し、各 150 文字以内で理由を併記。最後に参考ソース名を列挙。

セキュリティ/運用
- IAM: Bedrock の Invoke 権限、Secrets Manager/SSM に DB 資格情報保管
- RDS: 暗号化、有効なセキュリティグループ、最小権限の DB ユーザー
- ログ: rec_logs にリクエスト、採択候補 ID、モデル、コスト目安を記録

デプロイ戦略（POC）
- まずはローカルから RDS へ接続して ETL/検索の確認
- Terraform で RDS と最低限のネットワークリソース/IAM をスケルトン化
- アプリ公開は不要。必要なら Next.js 側に API route を生やして連携（別タスク）

非機能
- レイテンシ: Top-k 16 以内、コンテキスト ~2-3k tokens、Claude 3 Sonnet
- コスト: 埋め込みは一括作成・差分更新、生成はユーザー操作時のみ

拡張計画
- Rerank 導入（BM25 + ベクトルのハイブリッド / 2 段階 LLM）
- オンライン学習（ユーザーの Like/Skip を特徴量化）
- 評価データセット（既知の好み → 適合率/再現率を定点観測）

ファイル構成（本ディレクトリ）
- README.md: サマリ
- docs/DESIGN.md: 本ドキュメント
- docs/TASKS.md: タスク・マイルストーン
- db/schema.sql: RDS スキーマ
- infra/terraform/*: 最小の Terraform スケルトン

メモ（AGENTS.md について）
- リポジトリ直下に AGENTS.md は見つかりませんでした。本設計・タスクは一般的なエージェント指向の進め方に準拠しています。正式な AGENTS.md があれば共有ください。整合化して更新します。

