// Parse lời bài hát dạng LRC (synced) thành mảng { time, text }
export function parseLrcLyrics(lrcText, totalDuration) {
  const lines = lrcText.split("\n");
  const parsed = [];

  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const time = min * 60 + sec;
      const text = match[4].trim();
      if (text) {
        parsed.push({ time, text });
      }
    }
  }

  if (parsed.length === 0 && totalDuration) {
    const step = totalDuration / (lines.length + 1);
    return lines
      .filter((l) => l.trim())
      .map((text, idx) => ({
        time: Math.round((idx + 1) * step),
        text: text.trim(),
      }));
  }

  return parsed;
}
