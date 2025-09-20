# タスク完了時のチェックリスト

## 開発完了時に実行すべきコマンド

### 必須チェック
1. **TypeScript型チェック**
   ```bash
   npx tsc --noEmit
   ```

2. **ESLintによるコード品質チェック**
   ```bash
   pnpm lint
   # または npm run lint / yarn lint
   ```

3. **ビルドの動作確認**
   ```bash
   pnpm build
   # エラーが出ないことを確認
   ```

### 推奨チェック
4. **開発サーバーでの動作確認**
   ```bash
   pnpm dev
   # http://localhost:3000 で機能が正常に動作することを確認
   ```

5. **Git状態の確認**
   ```bash
   git status
   git diff
   ```

## コード品質チェックポイント
- [ ] TypeScriptの型エラーがない
- [ ] ESLintのwarning/errorがない
- [ ] 不要なconsole.logが残っていない
- [ ] 型定義が適切に設定されている
- [ ] Reactのベストプラクティスに従っている
- [ ] Supabaseクライアントの使用方法が適切

## データベース関連（該当する場合）
- [ ] スキーマ変更がsupabase/schema.sqlに反映されている
- [ ] マイグレーションが正常に実行される
- [ ] 既存データに影響がないことを確認

## UI/UX確認
- [ ] レスポンシブデザインが適切
- [ ] アクセシビリティが考慮されている
- [ ] 日本語UI文言が適切