# Bedrock + RAG + RDS Coffee Recommender (POC)

このディレクトリは、AWS Bedrock と RDS (PostgreSQL + pgvector) を用いて、手元のコーヒーデータからレコメンドを行う RAG 構成の検証用プロジェクトです。メインアプリ（Next.js + Supabase）とは分離して試験構築します。

- 設計: `docs/DESIGN.md`
- タスク: `docs/TASKS.md`
- DB スキーマ: `db/schema.sql`
- サンプルデータ: `db/seed.sql`
- インフラ (Terraform スケルトン): `infra/terraform/`
  - VPC, RDS(PostgreSQL), Lambda(API Gateway 経由で Bedrock 代理呼出), Bedrock ログ設定

注意: 本ディレクトリは POC 用です。動作させるには AWS 資格情報、RDS 接続先、Bedrock 対応リージョンなどの環境準備が別途必要です。

## 使い方（ローカル POC）

前提
- PostgreSQL 16 など（pgvector 拡張インストール済みでなくても `db:init` が作成を試みます）
- AWS 認証情報（環境変数 or プロファイル）

手順
1) 依存インストール
```
cd experiments/bedrock-rag-coffee
pnpm i # または npm i / yarn
```
2) `.env` 作成（`.env.example` をコピーし、RDS/AWS を設定）
```
cp .env.example .env
```
3) DB 初期化 + シード投入
```
pnpm db:init
psql "$PGURL" -f db/seed.sql # もしくは psql -h $RDS_HOST -U $RDS_USER -d $RDS_DB -f db/seed.sql
```
4) ドキュメント生成（チャンク + 埋め込み）
```
pnpm docs:build
```
5) 類似検索テスト
```
pnpm search "酸味控えめでチョコ系"
```
6) レコメンド生成（Claude 3 Sonnet）
```
pnpm recommend "酸味控えめでチョコ系の風味が好き"
```

テストデータの自動生成
```
# 引数: <beans> <brewsPerBean> <tastingsPerBrew>
pnpm gen:test            # 既定: 12 2 1 を投入
pnpm docs:build          # 生成後に埋め込みを作成
pnpm recommend "フローラルで明るい酸味が欲しい"  # 動作確認
```

## Terraform で Bedrock/Lambda/RDS を構築

1) 変数ファイル作成
```
cd infra/terraform
cat > dev.tfvars << 'EOF'
aws_region = "ap-northeast-1"
allowlist_cidr = "YOUR.IP.ADDR.1/32" # RDS 接続許可
db_password = "your-strong-password"
bedrock_generation_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
bedrock_embedding_model_id  = "amazon.titan-embed-text-v1"
EOF
```

2) 反映
```
terraform init
terraform apply -var-file=dev.tfvars
```

3) 出力を利用
```
export RDS_HOST=$(terraform output -raw rds_endpoint)
export RDS_PORT=$(terraform output -raw rds_port)
```
API 経由で Bedrock 呼び出し
```
API_URL=$(terraform output -raw api_invoke_url)
curl -s -X POST "$API_URL/invoke" -H 'content-type: application/json' \
  -d '{"action":"generate","system":"あなたは日本語のバリスタ。","userText":"酸味控えめでチョコ系の豆をおすすめして"}' | jq -r .text
```

注意: モデルアクセスは AWS コンソールの Bedrock から対象モデルを有効化してください（Terraform ではリクエスト不可の場合があります）。
