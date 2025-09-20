# FastAPI RAG Coffee (Bedrock via Lambda)

ローカルのPostgreSQL + pgvector を使い、Bedrock は既存の Lambda 経由（`curl` で呼べている想定）で RAG によるコーヒー豆レコメンドを行う検証用FastAPIサーバです。

## 前提
- PostgreSQL がローカルで起動済み（例: `localhost:5432`）
- pgvector 拡張が利用可能（`/init-db`で自動作成を試みます）
- Bedrock 呼び出し用の Lambda HTTP エンドポイントが利用可能（`/invoke` に対し `action: embed|generate` をPOST）

## セットアップ
1) 依存インストール
```
cd experiments/fastapi-rag-coffee
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) 環境ファイル
```
cp .env.example .env
# LAMBDA_API_URL を、現在 curl で叩いているエンドポイントに合わせて設定
# DB_* も必要に応じて修正
```

3) DB初期化（スキーマ作成）
- FastAPI起動後に `POST /init-db` を叩くか、直接SQLを流します。
```
# サーバ起動
uvicorn app.main:app --reload
# 別ターミナルから
curl -X POST http://127.0.0.1:8000/init-db
```

4) データ投入（例）
- まずは最低限の豆データを手入力やSQLで投入してください。
```
psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER password=$DB_PASSWORD" \
  -f db/seed.sql
```

5) ドキュメント生成（チャンク+埋め込み）
```
curl -X POST http://127.0.0.1:8000/documents/build
```

6) 類似検索・レコメンド
```
# 類似検索（デバッグ）
curl -s "http://127.0.0.1:8000/search?query=酸味控えめでチョコ系&k=5" | jq .

# レコメンド
curl -s -X POST http://127.0.0.1:8000/recommend \
  -H 'content-type: application/json' \
  -d '{"query":"酸味控えめでチョコ系の風味が好き"}' | jq .
```

## 環境変数
`.env`（`.env.example`参照）
- `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`
- `LAMBDA_API_URL`: 例 `https://xxxxxx.execute-api.ap-northeast-1.amazonaws.com/invoke`
- `EMBEDDING_DIM`: Titan v2なら`1024`、G1なら`1536`など
- `MAX_TOKENS`: 生成時の最大トークン（デフォルト800）

## エンドポイント一覧
- `GET  /health` 健康チェック
- `POST /init-db` スキーマ作成
- `POST /documents/build` beansテーブルから論理ドキュメントを作成し埋め込み投入
- `GET  /search?query=...&k=10` 類似チャンク検索
- `POST /recommend {query, top_k?}` RAGレコメンド（Claude系想定）

注意: これはPoCです。エラーハンドリングは最小限で、認証・RLSは省略しています。

## 推薦ロジックの解説

実装の背景やフロー図（Mermaid）は `docs/RECOMMENDATION.md` にまとめています。
重複除去（docごと最良チャンク）や、参照番号とcontextsの対応などの設計意図も記載しています。

# 推薦結果例
```
curl -s -X POST http://127.0.0.1:8000/recommend -H 'content-type: application/json' -d '{"query":"酸味系で香りが良い豆が好きです。桜の香りがするとなお良いです。"}' | jq .
{
  "ok": true,
  "answer": "# おすすめのコーヒー豆\n\n1. **China Citrus Tea #38 (Beta Roasters)**  \n   浅煎りで軽やかな酸味と花のような香りが特徴。フローラルノートがあり、桜を連想させる繊細な香りを楽しめます。酸味好きの方に最適な一杯です。(参考: #13,#14)\n\n2. **Costa Rica Honey Glow #06 (Beta Roasters)**  \n   ミディアムライト焙煎で柑橘と林檎の爽やかな酸味に蜂蜜の甘さが調和。フルーティーさと華やかな香りが桜のイメージに近く、酸味系コーヒーの良さを堪能できます。(参考: #15,#16)\n\n3. **Guatemala Cocoa Orange #25 (Demo Roasters)**  \n   オレンジの爽やかな酸と香りが特徴。ココアのまろやかさとのバランスが良く、酸味と香りの両方を楽しめる一杯です。(参考: #11,#12)",
  "contexts": [
    {
      "ref": 1,
      "title": "Bean: Yemen Mocha Classic #16 (Delta Coffee)",
      "content": "伝統的なモカ香、ココアの厚み フレーバーノート: mocha, cocoa, spice 産地: Yemen 精製: Natural 焙煎度: medium"
    },
    {
      "ref": 2,
      "title": "Bean: Yemen Mocha Classic #16 (Delta Coffee)",
      "content": "伝統的なモカ香、ココアの厚み フレーバーノート: mocha, cocoa, spice 産地: Yemen 精製: Natural 焙煎度: medium"
    },
    {
      "ref": 3,
      "title": "Bean: Vietnam Nut Cocoa #40 (Delta Coffee)",
      "content": "ナッツとココアが主体 フレーバーノート: nutty, cocoa, molasses 産地: Vietnam 精製: Natural 焙煎度: medium-dark"
    },
    {
      "ref": 4,
      "title": "Bean: Vietnam Nut Cocoa #40 (Delta Coffee)",
      "content": "ナッツとココアが主体 フレーバーノート: nutty, cocoa, molasses 産地: Vietnam 精製: Natural 焙煎度: medium-dark"
    },
    {
      "ref": 5,
      "title": "Bean: Colombia Cocoa Spice #03 (Test Beans)",
      "content": "ココアの厚みとスパイス感、余韻は長め フレーバーノート: cocoa, spice, molasses 産地: Colombia 精製: Honey 焙煎度: medium-dark"
    },
    {
      "ref": 6,
      "title": "Bean: Colombia Cocoa Spice #03 (Test Beans)",
      "content": "ココアの厚みとスパイス感、余韻は長め フレーバーノート: cocoa, spice, molasses 産地: Colombia 精製: Honey 焙煎度: medium-dark"
    },
    {
      "ref": 7,
      "title": "Bean: Yemen Classic Mocha #36 (Example Roastery)",
      "content": "伝統的モカ香と厚み フレーバーノート: mocha, spice, cocoa 産地: Yemen 精製: Natural 焙煎度: medium"
    },
    {
      "ref": 8,
      "title": "Bean: Yemen Classic Mocha #36 (Example Roastery)",
      "content": "伝統的モカ香と厚み フレーバーノート: mocha, spice, cocoa 産地: Yemen 精製: Natural 焙煎度: medium"
    },
    {
      "ref": 9,
      "title": "Bean: Honduras Cocoa Toffee #31 (Gamma Beans)",
      "content": "コクと甘さのバランス フレーバーノート: cocoa, toffee, nutty 産地: Honduras 精製: Honey 焙煎度: medium"
    },
    {
      "ref": 10,
      "title": "Bean: Honduras Cocoa Toffee #31 (Gamma Beans)",
      "content": "コクと甘さのバランス フレーバーノート: cocoa, toffee, nutty 産地: Honduras 精製: Honey 焙煎度: medium"
    },
    {
      "ref": 11,
      "title": "Bean: Guatemala Cocoa Orange #25 (Demo Roasters)",
      "content": "オレンジとココアが調和 フレーバーノート: cocoa, orange, toffee 産地: Guatemala 精製: Honey 焙煎度: medium"
    },
    {
      "ref": 12,
      "title": "Bean: Guatemala Cocoa Orange #25 (Demo Roasters)",
      "content": "オレンジとココアが調和 フレーバーノート: cocoa, orange, toffee 産地: Guatemala 精製: Honey 焙煎度: medium"
    },
    {
      "ref": 13,
      "title": "Bean: China Citrus Tea #38 (Beta Roasters)",
      "content": "軽やかで飲みやすい フレーバーノート: citrus, tea, floral 産地: China 精製: Washed 焙煎度: light"
    },
    {
      "ref": 14,
      "title": "Bean: China Citrus Tea #38 (Beta Roasters)",
      "content": "軽やかで飲みやすい フレーバーノート: citrus, tea, floral 産地: China 精製: Washed 焙煎度: light"
    },
    {
      "ref": 15,
      "title": "Bean: Costa Rica Honey Glow #06 (Beta Roasters)",
      "content": "蜂蜜のような甘さと柔らかな酸 フレーバーノート: honey, citrus, apple 産地: Costa Rica 精製: Honey 焙煎度: medium-light"
    },
    {
      "ref": 16,
      "title": "Bean: Costa Rica Honey Glow #06 (Beta Roasters)",
      "content": "蜂蜜のような甘さと柔らかな酸 フレーバーノート: honey, citrus, apple 産地: Costa Rica 精製: Honey 焙煎度: medium-light"
    }
  ],
  "candidates": [
    {
      "doc_id": 18,
      "chunk_index": 0,
      "distance": 0.38034217098448364
    },
    {
      "doc_id": 68,
      "chunk_index": 0,
      "distance": 0.38034217098448364
    },
    {
      "doc_id": 92,
      "chunk_index": 0,
      "distance": 0.4170070090909609
    },
    {
      "doc_id": 42,
      "chunk_index": 0,
      "distance": 0.4170070090909609
    },
    {
      "doc_id": 5,
      "chunk_index": 0,
      "distance": 0.41797196963179184
    },
    {
      "doc_id": 55,
      "chunk_index": 0,
      "distance": 0.41797196963179184
    },
    {
      "doc_id": 38,
      "chunk_index": 0,
      "distance": 0.42450029484153873
    },
    {
      "doc_id": 88,
      "chunk_index": 0,
      "distance": 0.42450029484153873
    }
  ]
}
```
