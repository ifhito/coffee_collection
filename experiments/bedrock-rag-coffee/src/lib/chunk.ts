export function chunkText(text: string, maxChars = 800): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + maxChars, clean.length);
    // try to break at sentence boundary within last 100 chars
    const windowStart = Math.max(i, end - 100);
    const slice = clean.slice(windowStart, end);
    const p = slice.lastIndexOf('.');
    const breakIdx = p > -1 ? windowStart + p + 1 : end;
    chunks.push(clean.slice(i, breakIdx).trim());
    i = breakIdx;
  }
  return chunks.filter(Boolean);
}

