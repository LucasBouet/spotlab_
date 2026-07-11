export type LyricLine = { time: number; text: string };

// Matches one or more leading `[mm:ss.xx]` timestamps on an LRC line. The
// fraction can be 1-3 digits (centiseconds or milliseconds).
const LRC_TIMESTAMP_REGEX = /\[(\d{2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const rawLine of lrc.split("\n")) {
    const timestamps = [...rawLine.matchAll(LRC_TIMESTAMP_REGEX)];
    if (timestamps.length === 0) continue;

    const text = rawLine.replace(LRC_TIMESTAMP_REGEX, "").trim();
    for (const match of timestamps) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ? Number(match[3].padEnd(3, "0")) / 1000 : 0;
      lines.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}
