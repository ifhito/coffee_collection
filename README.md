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

`.env.sample` をコピーして環境変数ファイルを準備：

```bash
cp .env.sample .env
```

`.env` は Prisma CLI やバックエンド処理で参照されます。最低限 `DATABASE_URL` を設定してください：

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Next.js（フロントエンド／API ルート）向けの設定は `.env.local.example` を参考に `.env.local` を作成し、必要な値を上書きしてください：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
SUPABASE_USE_LOCAL=false
NEXT_PUBLIC_SUPABASE_URL_DEV=http://localhost:54321
IMPORT_USER_ID=your_user_id_here
NODE_ENV=development
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースマイグレーション（Prisma）

Prisma を利用して Supabase（PostgreSQL）のスキーマを適用します。

1. `.env` に `DATABASE_URL` を設定（ローカル Supabase の場合は `postgresql://postgres:postgres@127.0.0.1:54322/postgres`）。
2. Supabase ローカルを起動済みでない場合は `supabase start` などで立ち上げる。
3. Prisma マイグレーションを適用：

```bash
npm run prisma:migrate:deploy
```

マイグレーションファイルは `prisma/migrations/` 配下で管理されます。新しいテーブル追加などの際は Prisma を介してマイグレーションを作成してください。

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
- **Schema Management**: Prisma
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Data Visualization**: HTML5 Canvas
