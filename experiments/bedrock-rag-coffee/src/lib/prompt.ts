export function buildSystemPrompt() {
  return (
    'あなたはプロのバリスタ兼キュレーターです。利用可能なデータ（豆情報、テイスティング、抽出設定）に基づき、日本語で簡潔かつ具体的な推薦を返します。' +
    ' 参考になった根拠（豆名や要約）も併記してください。'
  );
}

export function buildUserPrompt(
  query: string,
  contexts: { title?: string; content: string }[],
): string {
  const ctx = contexts
    .map((c, i) => `【#${i + 1}${c.title ? `: ${c.title}` : ''}】\n${c.content}`)
    .join('\n\n');
  return (
    `次のコンテキストと条件に基づいて、条件に合うコーヒー豆を最大3件推薦してください。\n` +
    `各推薦は150文字以内で「理由」を書き、最後に参考ソース番号を括弧で示してください（例: (参考: #1,#3)）。\n` +
    `\n[条件]\n${query}\n\n[コンテキスト]\n${ctx}`
  );
}

