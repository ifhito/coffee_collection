from typing import Sequence


def build_system_prompt() -> str:
    return (
        "あなたはプロのバリスタ兼キュレーターです。利用可能なデータ（豆情報、テイスティング、抽出設定）に基づき、"
        "日本語で簡潔かつ具体的な推薦を返します。参考になった根拠（豆名や要約）も併記してください。"
    )


def build_user_prompt(query: str, contexts: Sequence[dict]) -> str:
    ctx = []
    for i, c in enumerate(contexts, 1):
        title = c.get("title")
        content = c.get("content", "")
        head = f"【#{i}{': ' + title if title else ''}】"
        ctx.append(f"{head}\n{content}")
    joined = "\n\n".join(ctx)
    return (
        "次のコンテキストと条件に基づいて、条件に合うコーヒー豆を最大3件推薦してください。\n"
        "各推薦は150文字以内で「理由」を書き、最後に参考ソース番号を括弧で示してください（例: (参考: #1,#3)）。\n"
        f"\n[条件]\n{query}\n\n[コンテキスト]\n{joined}"
    )

