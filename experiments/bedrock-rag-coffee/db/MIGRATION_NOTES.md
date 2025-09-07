# Supabase -> RDS 移行メモ（POC）

前提
- 本 POC は Supabase 本番とは分離し、RDS(PostgreSQL) に最小限のデータを再配置します。
- 初回は Supabase の `beans` 相当、`brews`、`tastings` を CSV/SQL エクスポートし、RDS にロードします。

マッピング（例）
- Supabase.beans → RDS.beans（列名はできるだけ合わせるが、`flavor_notes` は TEXT[] で受ける）
- Supabase.brews → RDS.brews（method/dose/ratio 等をマッピング）
- Supabase.tastings → RDS.tastings（liking/notes）

ドキュメント生成（RAG 対象）
- beans.description と flavor_notes から 1 ドキュメント
- tastings.notes を集約して bean ごと要約（summary）を 1 ドキュメント
- それぞれチャンク化・埋め込みし、chunks に保存

手順（初回）
1) Supabase から CSV をダンプ
2) psql で `COPY` もしくは簡易スクリプトで INSERT/UPSERT
3) 生成ルールに従って documents/chunks を作成
4) ANALYZE 実行後、ivfflat インデックスを作成

差分同期（任意）
- POC では手動で再取込する。将来的に CDC or 定期 ETL を検討

