# Coffee Collection App

コーヒー豆の管理とテイスティング記録ができるNext.js + Supabaseアプリケーションです。

## 機能

- ☕ **豆管理**: コーヒー豆の詳細情報を記録・管理
- 📊 **テイスティング**: 好み度、香り、酸味、苦味を5段階で評価
- 🏪 **ショップ管理**: ロースターやコーヒーショップの情報管理
- 📈 **ダッシュボード**: 統計情報と最近のテイスティング履歴
- 🌟 **ビジュアライゼーション**: コンステレーション形式でのデータ表示

## セットアップ

### 1. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成：

```bash
cp .env.local.example .env.local
```

`.env.local` を編集してSupabaseの設定を追加：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
IMPORT_USER_ID=your_user_id_here
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Supabaseスキーマのセットアップ

Supabaseプロジェクトで以下のmigrationを実行：

```sql
-- supabase/migrations/20250101000000_initial_setup.sql をSQL Editorで実行
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## Notionデータのインポート

既存のNotionデータベースからデータをインポートできます：

```bash
npm run import-notion
```

詳細は [docs/IMPORT_NOTION.md](docs/IMPORT_NOTION.md) を参照してください。

## 技術スタック

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Data Visualization**: HTML5 Canvas
