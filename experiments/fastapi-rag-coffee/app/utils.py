def chunk_text(text: str, max_chars: int = 800) -> list[str]:
    clean = " ".join(text.split()).strip()
    if len(clean) <= max_chars:
        return [clean] if clean else []
    out: list[str] = []
    i = 0
    n = len(clean)
    while i < n:
        end = min(i + max_chars, n)
        window_start = max(i, end - 100)
        slice_ = clean[window_start:end]
        p = slice_.rfind("。")
        if p == -1:
            p = slice_.rfind(".")
        break_idx = window_start + p + 1 if p != -1 else end
        out.append(clean[i:break_idx].strip())
        i = break_idx
    return [c for c in out if c]

