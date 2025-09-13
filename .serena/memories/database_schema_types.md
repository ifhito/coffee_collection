# データベーススキーマと型定義

## 主要な型定義（lib/types.ts）

### コア型
```typescript
type UUID = string
type Score1to5 = 1 | 2 | 3 | 4 | 5
```

### データベーステーブル型

#### BeanBatch（豆バッチ）
- コーヒー豆の情報とバッチ管理

#### Brew（抽出記録）
- コーヒーの抽出履歴
- 豆量は在庫に反映される

#### Tasting（テイスティング）
- 抽出に対する評価・テイスティングノート
- Score1to5での評価システム

#### InventoryLog（在庫ログ）
- 豆の在庫変動履歴

#### Shop（ショップ）
- 豆の購入先情報

## データベーススキーマ
- **場所**: `supabase/schema.sql`
- **適用方法**: Supabase SQL Editorにコピー&ペーストして実行
- **認証**: Supabase Auth使用（メール/パスワード）

## データフロー
1. **豆追加** → BeanBatch作成
2. **抽出記録** → Brew作成 + 在庫減算 + InventoryLog追加
3. **テイスティング** → 特定のBrewに対してTasting作成
4. **可視化** → Tastingデータを基にD3.jsで表示