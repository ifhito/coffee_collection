# コードスタイルと規約

## TypeScript設定
- **strict mode**: 有効
- **target**: ES2020
- **module**: ESNext
- **baseUrl**: "." （プロジェクトルート）
- **path mapping**: "@/*" で相対パス解決
- **JSX**: preserve（Next.jsが処理）

## 命名規約
- **ファイル名**: kebab-case または PascalCase（コンポーネント）
- **コンポーネント**: PascalCase（例: `LoggedInDashboard`）
- **関数**: camelCase（例: `signIn`, `signOut`）
- **変数**: camelCase（例: `setBeans`, `setTastings`）
- **型定義**: PascalCase（例: `BeanBatch`, `Tasting`）

## コンポーネント構造
```typescript
// React Hook使用パターン
export default function ComponentName() {
  const [state, setState] = useState<Type>(defaultValue)
  
  useEffect(() => {
    // 副作用処理
  }, [])

  const handleEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    // イベント処理
  }

  return (
    <div className="space-y-6">
      {/* JSX */}
    </div>
  )
}
```

## CSS/スタイリング
- **Tailwind CSS風のクラス名**を使用
- `space-y-6`, `text-2xl`, `font-semibold` などのユーティリティクラス
- フォーカス時のアウトライン: `focus-visible:ring-ring/50`

## インポート規約
```typescript
// React関連
import { useState, useEffect } from 'react'

// 外部ライブラリ
import { supabase } from '@/lib/supabase/client'

// 型定義
import type { BeanBatch, Tasting } from '@/lib/types'
```

## コメント
- 日本語コメント・UI文言が多用されている
- JSXの文言は日本語（例: "ダッシュボード"）