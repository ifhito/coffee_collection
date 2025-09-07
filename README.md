# coffee_collection

Next.js + Supabase で構築する個人向けコーヒー豆管理アプリ。

## セットアップ

1) Supabase プロジェクト作成し、`.env.local` を作成

```
cp .env.example .env.local
# SUPABASE_* をプロジェクトの値で更新
```

2) スキーマ反映（Supabase SQL Editor or CLI）

```
-- supabase SQL editor に supabase/schema.sql を貼り付けて実行
```

3) 依存インストールと起動

```
pnpm i # or npm i / yarn
pnpm dev # http://localhost:3000

4) 使い方（MVP）
- ルートでメール/パスワードでサインイン（事前にユーザー作成可）。
- Beans: 豆バッチの追加・在庫の微調整・アーカイブ。
- Add Brew: 豆を選び抽出を記録（豆量は在庫に反映 + 在庫ログを追加）。
- Add Tasting: 抽出に対するテイスティング（好き度など）を記録。
- Viz: 好き度をリングで可視化する簡易コンステレーション表示。
```

## ドキュメント
- 要件定義: `docs/REQUIREMENTS.md`
- 設計: `docs/DESIGN.md`（Next.js + Supabase 構成）
- DB スキーマ: `supabase/schema.sql`
 - ADR: `docs/adr/0001-tech-stack.md`
