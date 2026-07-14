"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "spotlab:lyrics-offsets";
// One tap moves the lyrics by half a second — fine enough to line up a
// mismatched LRC, coarse enough to converge in a couple of taps.
export const LYRICS_OFFSET_STEP = 0.5;
const MAX_OFFSET = 20;

type OffsetMap = Record<string, number>;

function readMap(): OffsetMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OffsetMap) : {};
  } catch {
    return {};
  }
}

function writeOffset(trackId: number, value: number) {
  if (typeof window === "undefined") return;
  const map = readMap();
  // Don't keep zero entries around — a reset should leave no trace to grow the
  // blob unbounded over time.
  if (value === 0) delete map[String(trackId)];
  else map[String(trackId)] = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full/unavailable — the offset still applies for this session.
  }
}

// Per-track lyrics timing offset in seconds, remembered per device in
// localStorage so a correction survives reloads. Positive shifts the highlight
// later (lyrics were running ahead of the vocals), negative shifts it earlier.
// Kept device-local on purpose: an lrclib/recording mismatch and a device's own
// playback drift can differ from one device to the next.
export function useLyricsOffset(trackId: number | null) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Load the stored offset whenever the track changes.
  useEffect(() => {
    setOffset(trackId === null ? 0 : (readMap()[String(trackId)] ?? 0));
  }, [trackId]);

  const apply = useCallback(
    (next: number) => {
      const clamped =
        Math.round(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, next)) * 10) / 10;
      setOffset(clamped);
      if (trackId !== null) writeOffset(trackId, clamped);
    },
    [trackId],
  );

  const nudge = useCallback(
    (direction: number) =>
      apply(offsetRef.current + direction * LYRICS_OFFSET_STEP),
    [apply],
  );

  const reset = useCallback(() => apply(0), [apply]);

  return { offset, nudge, reset };
}
