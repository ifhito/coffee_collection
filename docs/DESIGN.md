# コーヒー豆管理アプリ 設計（MVP）

本設計は `docs/REQUIREMENTS.md` を元にした MVP 向けの実装方針です。

## 1. アーキテクチャ概要（Next.js + Supabase）
- フレームワーク: Next.js（App Router, TypeScript）
- データベース: Supabase（Postgres + Auth + Storage）
- 認証: Supabase Auth（RLS 前提）
- データアクセス: `@supabase/supabase-js` + Next.js Server Actions/Route Handlers
- 状態管理: 軽量ストア（必要時のみ）+ URL クエリでフィルタ保持
- 可視化: D3.js + Canvas/SVG（端末に応じ切替）

理由:
- RLS による安全なマルチテナンシを簡潔に実現。
- Next.js の Server Components/Actions で安全な DB アクセスと高速 UI。

## 2. データ設計
スカラーは基本 `string | number | boolean | Date`。ID は UUID。

エンティティ
- BeanBatch（豆バッチ）
  - id, name, roaster, roast_level, roast_date,
  - origin_country, origin_region, farm, variety, process,
  - purchase_shop_id, purchase_date, price,
  - initial_weight_g, current_weight_g, notes, tags[]
  - created_at, updated_at, archived:boolean
- Shop（購入店/ロースター）
  - id, name, type:"shop"|"roaster"|"online", url, address, memo
- Brew（抽出）
  - id, bean_batch_id, method, dose_g, grind, water_g, temperature_c, time_sec, agitation, equipment[], date
- Tasting（テイスティング）
  - id, brew_id,
  - liking(1-5), aroma(1-5), sourness(1-5), bitterness(1-5),
  - sweetness(1-5, optional), body(1-5, optional), aftertaste(1-5, optional),
  - flavor_notes[], comment, photos[], created_at
- InventoryLog（在庫変動）
  - id, bean_batch_id, delta_g, reason:"brew"|"adjust"|"other", at
- Tag
  - id, label, color

インデックス（IndexedDB/Dexie）
- BeanBatch: by id (pk), by roaster+roast_level, by archived, by tags, by roast_date
- Brew: by bean_batch_id, by date
- Tasting: by brew_id, by created_at, by liking, by aroma/sourness/bitterness
- InventoryLog: by bean_batch_id, by at
- Shop: by name

整合性
- Brew は BeanBatch に従属。
- Tasting は Brew に従属（1:1 or 1:n どちらも許容、UI は 1:1 を推奨）。
- InventoryLog は Brew 登録時に自動で `delta_g = -dose_g` を追加。

型（TypeScript 例・抜粋）
```ts
export type Score1to5 = 1|2|3|4|5
export interface Tasting {
  id: string
  brew_id: string
  liking: Score1to5
  aroma: Score1to5
  sourness: Score1to5
  bitterness: Score1to5
  sweetness?: Score1to5
  body?: Score1to5
  aftertaste?: Score1to5
  flavor_notes: string[]
  comment?: string
  photos: string[] // object URL or base64（将来: ファイルハンドル）
  created_at: string // ISO8601
}
```

## 3. 画面設計（MVP）
- ダッシュボード
  - 在庫サマリ、最近の抽出、最近の好き度トップ3、可視化への導線。
- 豆一覧/詳細
  - メタ情報、在庫推移、関連 Brew/Tasting、タグ編集。
- 追加フロー（ステップ短縮）
  1) 豆の選択 or 新規豆登録
  2) 抽出入力（メソッド/量/温度/時間/挽き目）
  3) テイスティング入力（好き度/香り/酸っぱさ/苦さ、任意: 甘さ/ボディ/後味、フレーバー、写真、感想）
- 可視化
  - フレーバー・コンステレーション（点=テイスティング）
  - 産地マップ（簡易）
- 検索/フィルタ
  - 産地/焙煎度/購入店/タグ/在庫/好き度/香り/酸っぱさ/苦さ

UI コンポーネント（概略）
- Layout: `AppShell`, `Header`, `TabNav`, `FilterBar`
- Beans: `BeanList`, `BeanCard`, `BeanDetail`, `TagChips`
- Brew: `BrewForm`, `BrewList`
- Tasting: `TastingForm`（スコア入力：好き度/香り/酸っぱさ/苦さ）, `FlavorChips`, `PhotoPicker`
- Viz: `ConstellationCanvas`, `Legend`, `MapView`
- Common: `NumberField`, `Stepper`, `Slider5`, `Rating5`, `DateField`, `SearchInput`

入力 UX
- スコアは 1–5 の 5 段ステッパ（キーボード左右/スワイプ対応）。
- 前回レシピ/前回スコアのコピー、テンプレ保存。
- 必須最小項目: 好き度、香り、酸っぱさ、苦さ（写真/コメントは任意）。

## 4. ビジュアライザ設計（コンステレーション）
- データ点: Tasting レコード。
- 位置: フレーバーカテゴリを円環（セクタ）に配置し、ノートに応じて扇内ランダム/重心配置。
- 符号化
  - サイズ: 好き度（大きいほど好み）。
  - 色相: 焙煎度（浅=明るい/中=中間/深=濃い）。
  - 輝度/形状: 抽出メソッド差別化、もしくは outline。
  - 透明度: 経過時間（古いほど薄く）。
- インタラクション
  - ピンチズーム/パン、ホバー/タップで詳細。
  - フィルタ: 期間、豆、ロースター、スコア範囲（好き度/香り/酸っぱさ/苦さ）。
  - スナップショット保存（PNG 生成）。
- パフォーマンス
  - 500–1,000 点を 60fps 目標。Canvas ベース、D3 はスケール/レイアウト支援に限定。

## 5. フィルタ/検索のデータフロー
- UI で条件更新 → ストアに保持 → クエリ関数で IndexedDB に問い合わせ。
- 代表クエリ例
  - 好き度が N 以上、香りが M 以上の Tasting を期間で抽出。
  - 同一ロースター × 中煎り × ハンドドリップの高評価順。
  - 在庫ありの豆バッチで最近 30 日に抽出あり。

## 6. 永続化/バックアップ
- スキーマ管理: `supabase/schema.sql`（DDL + RLS + INDEX）。
- バックアップ: Supabase の自動バックアップ + エクスポート（将来）。

## 7. エラー処理/品質
- 入力検証: 1–5 の整数、温度/重量の範囲チェック。
- 失敗時の再試行: 書込みは幂等トランザクション。画像は遅延保存。
- ログ: ローカルリングバッファ + 任意ユーザー送信。
- テスト: 単体（ユーティリティ/クエリ）、E2E は主要フローのみ（追加→抽出→評価→可視化）。

## 8. アクセシビリティ/国際化
- スコア入力はボタンとスライダーの両 UI 提供、ラベルと ARIA 属性付与。
- カラーのみ依存を回避（サイズ/形状を併用）。
- i18n 準備（キー化された文言、ja をデフォルト）。

## 9. セキュリティ/プライバシー
- RLS: すべての行に `user_id`、`auth.uid()` によるポリシー。
- 権限: 参照/追加/更新/削除は本人のみ。
- 画像: Supabase Storage（バケット: `photos`、RLS: ユーザー別）

## 10. 拡張計画
- v1.1: 通知（焙煎ピーク/在庫）、フィルタ保存、写真編集。
- v1.2: ロースト・ジャーニーマップ、簡易レコメンド（高評価条件の抽出）。

---
この設計は MVP の目安です。フレームワーク（React/Svelte）と永続化実装（Dexie/SQLite WASM）を決め次第、雛形コードと DB スキーマ初期化を追加します。
