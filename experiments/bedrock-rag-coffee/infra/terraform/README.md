# Terraform スケルトン（POC）

このフォルダは RDS(PostgreSQL) と最小限のネットワークリソース/IAM、Bedrock 呼び出し用 Lambda/API Gateway、Bedrock ログ設定を Terraform で構築するためのコードです。

注意
- 実際のプロビジョニングは未実装です。`main.tf` に必要なリソースを順次追加してください。
- DB 認証情報は AWS Secrets Manager or SSM Parameter Store を利用してください。

想定リソース
- VPC / Public Subnets / Internet Gateway / Route Table
- RDS PostgreSQL (db.t3.micro, Publicly Accessible: true — POC用途)
- IAM（Lambda 実行ロール + Bedrock Invoke 権限）
- Lambda（Bedrock プロキシ）+ API Gateway（HTTP API `/invoke`）
- Bedrock モデル呼び出しログの S3 設定

前提
- アカウントで Bedrock モデルアクセスが有効化されていること（コンソールから対象モデルを許可）
- 適切な AWS 権限（RDS/Lambda/API Gateway/S3/IAM）

入力変数例（`dev.tfvars`）
```
aws_region               = "ap-northeast-1"
allowlist_cidr           = "YOUR.IP.ADDR.1/32" # RDS への接続元
db_password              = "your-strong-password"
# オンデマンドで使えるモデルの例（Haiku）。Sonnet等は inference profile が必要。
bedrock_generation_model_id = "anthropic.claude-3-haiku-20240307-v1:0"
bedrock_embedding_model_id  = "amazon.titan-embed-text-v1"

# Sonnet 等のプロファイル必須モデルを使う場合は下記を設定
# bedrock_generation_inference_profile_arn = "arn:aws:bedrock:ap-northeast-1:123456789012:inference-profile/your-profile-id"
```

実行手順
```
terraform init
terraform apply -var-file=dev.tfvars
```

出力
- `rds_endpoint`, `rds_port`: RDS 接続先
- `api_invoke_url` + `/invoke`: Bedrock プロキシのエンドポイント
- `logs_bucket`: Bedrock 呼び出しログの S3 バケット

API 利用例
```
# 生成（Claude 3 Sonnet を Inference Profile で呼び出し）
curl -s -X POST "$(terraform output -raw api_invoke_url)/invoke" \
  -H 'content-type: application/json' \
  -d '{"action":"generate","system":"あなたは日本語のバリスタ。","userText":"酸味控えめでチョコ系の豆をおすすめして","inferenceProfileArn":"arn:aws:bedrock:ap-northeast-1:123456789012:inference-profile/your-profile-id"}'

# 埋め込み（Titan）
curl -s -X POST "$(terraform output -raw api_invoke_url)/invoke" \
  -H 'content-type: application/json' \
  -d '{"action":"embed","text":"チョコレートの甘さ"}'

# 利用可能モデルの確認（ListFoundationModels）
curl -s -X POST "$(terraform output -raw api_invoke_url)/invoke" \
  -H 'content-type: application/json' \
  -d '{"action":"models"}' | jq -r '.models[]'

# 利用可能 Inference Profile の確認（部分一致でフィルタ可能）
# リージョンによっては `modelArn` が空文字のため、`nameContains` / `profileContains` を推奨
curl -s -X POST "$(terraform output -raw api_invoke_url)/invoke" \
  -H 'content-type: application/json' \
  -d '{"action":"profiles","region":"ap-northeast-1","nameContains":"sonnet"}' | jq

# 例: Claude 3.7 を探す（APAC 名称/ARN にもマッチ）
curl -s -X POST "$(terraform output -raw api_invoke_url)/invoke" \
  -H 'content-type: application/json' \
  -d '{"action":"profiles","region":"ap-northeast-1","profileContains":"claude-3-7"}' | jq

# Claude 3.7（Sonnet/Haiku）の簡易指定例（modelAlias を利用、リージョン明示可）
# modelAlias は "claude-3.7-sonnet" や "claude-3.7-haiku" を受け付けます。
curl -s -X POST "$(terraform output -raw api_invoke_url)/invoke" \
  -H 'content-type: application/json' \
  -d '{"action":"generate","region":"ap-northeast-1","modelAlias":"claude-3.7-sonnet","system":"あなたは日本語のバリスタ。","userText":"酸味控えめでチョコ系の豆をおすすめして"}'
```
