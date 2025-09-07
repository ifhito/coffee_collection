# AGENTS.md（POC 用ルール）

目的
- 本 POC を迅速かつ安全に進めるための役割分担と作業ルールを定義します。

役割
- Architect: 全体設計、技術選定、プロンプト方針、セキュリティの枠
- Infra: RDS/IAM/VPC の IaC、接続テスト
- Data: Supabase からのエクスポート、RDS へのロード、ドキュメント/チャンク生成
- App: 検索 API/CLI の実装、Bedrock 呼び出し、ログ保存

作業ルール
- 変更はこの `experiments/bedrock-rag-coffee/` 配下で完結させる
- 設計/意思決定は `docs/DESIGN.md` と `docs/TASKS.md` に反映
- 機微情報は `.env` ではなく Secrets Manager/SSM を優先（ローカルのみ .env 可）

定義済み成果物
- 設計: `docs/DESIGN.md`
- タスク: `docs/TASKS.md`
- スキーマ: `db/schema.sql`
- インフラスケルトン: `infra/terraform/`

Definition of Done（初回）
- 類似検索 + 推薦の流れがローカルから 1 回通る
- 推薦根拠（出典チャンク）をレスポンスに含められる
- rec_logs に最低限のログが残る

