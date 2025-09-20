# 推奨コマンド集

## 開発コマンド
```bash
# 開発サーバー起動
pnpm dev              # または npm run dev / yarn dev
# http://localhost:3000 でアクセス

# 本番ビルド
pnpm build            # または npm run build / yarn build

# 本番サーバー起動（ビルド後）
pnpm start            # または npm run start / yarn start

# リンティング
pnpm lint             # または npm run lint / yarn lint
```

## セットアップコマンド
```bash
# 依存関係インストール
pnpm i                # または npm i / yarn

# 環境変数設定
cp .env.example .env.local
# SUPABASE_* 変数を実際の値で更新する
```

## 基本的なシステムコマンド（Darwin）
```bash
# ファイル・ディレクトリ操作
ls                    # ファイル一覧
cd <directory>        # ディレクトリ移動
mkdir <directory>     # ディレクトリ作成
rm <file>             # ファイル削除
rm -rf <directory>    # ディレクトリ削除

# 検索・探索
find . -name "*.tsx"  # ファイル検索
grep -r "pattern" .   # テキスト検索

# Git操作
git status            # ステータス確認
git add .             # ファイル追加
git commit -m "msg"   # コミット
git push              # プッシュ
```

## Supabase関連
```bash
# SQLスキーマ適用
# supabase/schema.sql を Supabase SQL Editor にコピペして実行
```