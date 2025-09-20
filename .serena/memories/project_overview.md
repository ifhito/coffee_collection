# Coffee Collection - プロジェクト概要

## プロジェクトの目的
個人向けコーヒー豆管理アプリ。Next.js + Supabase で構築されており、以下の機能を提供する：

- **豆管理**: 豆バッチの追加・在庫の微調整・アーカイブ
- **抽出記録**: 豆を選び抽出を記録（豆量は在庫に反映 + 在庫ログを追加）
- **テイスティング記録**: 抽出に対するテイスティング（好き度など）を記録
- **可視化**: 好み度をリングで可視化する簡易コンステレーション表示

## 技術スタック
- **フロントエンド**: Next.js 14.2.5 + React 18.3.1 + TypeScript 5.4.5
- **バックエンド**: Supabase (PostgreSQL + Auth + Real-time)
- **データ可視化**: D3.js 7.9.0
- **スタイリング**: CSS (globals.css)
- **パッケージマネージャー**: yarn/pnpm/npm をサポート

## 主要なディレクトリ構造
```
coffee_collection/
├── app/                    # Next.js App Router
│   ├── beans/             # 豆管理ページ
│   ├── brews/             # 抽出記録ページ
│   ├── tastings/          # テイスティングページ
│   ├── viz/               # 可視化ページ
│   └── page.tsx           # ダッシュボード（ルートページ）
├── components/            # 再利用可能コンポーネント
│   ├── ui/                # UIコンポーネント
│   └── layout/            # レイアウトコンポーネント
├── lib/                   # ユーティリティとライブラリ
│   ├── supabase/          # Supabase クライアント設定
│   └── types.ts           # TypeScript型定義
├── supabase/              # データベーススキーマ
└── docs/                  # ドキュメント
```