# タスク計画（POC）

ゴール
- 既存データから RAG によるコーヒー推薦を返す最小構成を通す
- コスト最小、別ディレクトリで安全に試す

マイルストーン
1) 設計・スケルトン
   - [x] 設計ドキュメント作成（DESIGN.md）
   - [x] ディレクトリと README 追加
   - [ ] Terraform スケルトン配置（RDS/IAM の雛形）
2) DB スキーマ & データ
   - [x] RDS スキーマ定義（beans/brews/tastings/chunks など）
   - [ ] Supabase からのエクスポート -> 取込スクリプト（ローカル実行）
   - [ ] Embedding 生成（Titan）とチャンク保存
3) 検索 & 推薦生成
   - [ ] 類似検索（pgvector Top-k + メタフィルタ）
   - [ ] Bedrock Claude による推薦生成（日本語）
   - [ ] 推薦ログ保存（rec_logs）
4) インタフェース
   - [ ] 簡易 CLI or HTTP API（ローカル）
   - [ ] 必要なら Next.js への接続ポイント検討
5) セキュリティ/運用
   - [ ] IAM 権限最小化（Bedrock Invoke, Secrets Access）
   - [ ] Secrets 管理（SSM/Secrets Manager）
   - [ ] コスト・レイテンシ検証メモ

意思決定（AGENTS.md スタイル要約）
- スコープ: POC として RDS+pgvector を採用、OpenSearch は今回は見送り
- モデル: 生成は Claude 3 Sonnet、Embedding は Titan G1 Text
- データ: 豆説明とテイスティング要約を主対象に RAG
- 成功条件: 「条件指定で 3 件推薦 + 根拠表示」が安定して返る

リスク/懸念
- Supabase -> RDS の同期手段（初回はエクスポートで可、差分同期は別途）
- Bedrock のリージョン/モデル可用性（ap-northeast-1 想定）
- データが少ない場合の推薦品質（LLM の補完に依存）

次アクション
- [ ] Terraform 雛形を埋める（DB 名/ユーザー/サブネットは変数化）
- [ ] 取込スクリプトの枠（Node/TS or Python）を用意
- [ ] Embedding 生成 + 保存の最小ループを確認

