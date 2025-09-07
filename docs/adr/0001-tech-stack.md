# ADR 0001: 技術選定（Next.js + Supabase + D3）

- 日付: 2025-09-01
- ステータス: 承認（Accepted）

## 背景（Context）
- 個人向けコーヒー豆管理アプリの要件: 認証、RLS によるユーザー毎データ保護、在庫/抽出/テイスティングの CRUD、独自ビジュアライザ（高負荷時にも滑らか）、将来の写真保存・バックアップ。
- 初期 MVP は迅速な Web 展開と、ローカル/モバイル利用（PWA）を重視。

## 決定（Decision）
- フレームワーク: Next.js（App Router, TypeScript）。
- データベース/認証/ストレージ: Supabase（Postgres + RLS, Auth, Storage）。
- クライアント SDK: `@supabase/supabase-js`。
- 可視化: D3.js + Canvas/SVG（点群は Canvas を優先）。
- 言語/型: TypeScript。

## 主要な理由（Rationale）
- RLS による行レベルのマルチテナンシが標準機能で、個人データ保護の実装が簡潔。
- Next.js の Server Components/Actions で安全に DB アクセスを構成でき、UI レイテンシも最小化。
- Supabase は Auth/DB/Storage を統合提供し、写真保存や将来の共有拡張が容易。
- D3 + Canvas で 1,000 点規模のインタラクティブ描画に対応可能。

## 代替案と比較（Alternatives）
- SvelteKit + Supabase: 軽量で良いがチームの Next.js 親和性・エコシステム優先で見送り。
- PlanetScale/MySQL + NextAuth: RLS 不在のためテナント分離実装が増える。構築スピード面で Supabase に軍配。
- ローカル IndexedDB/PouchDB: オフラインは強いが、共有/バックアップ/写真管理に別途仕組みが必要。

## 影響（Consequences）
- 長所: 認証と RLS が一体で安全、開発速度が速い、可視化も Web 標準で実装容易。
- 短所: Supabase へのベンダーロックイン、完全オフラインは限定的（キャッシュ工夫は可）。
- 緩和: エクスポート/インポートの実装、将来的に Edge/SSR キャッシュ・Service Worker 導入を検討。

## 実装メモ（Implications）
- スキーマは `supabase/schema.sql` で管理し、RLS を全テーブルに適用。
- Auth はメール/パスワード（将来: Magic Link/OTP）を採用。
- Storage バケット `photos` にユーザー別プレフィックスで保存し、ストレージポリシーで保護。

