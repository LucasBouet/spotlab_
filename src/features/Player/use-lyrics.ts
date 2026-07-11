"use client";

import { useEffect, useState } from "react";
import type { PlayerTrack } from "@/features/Player/player-context";
import { type LyricLine, parseLrc } from "@/lib/lrc";

export type LyricsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "synced"; lines: LyricLine[] }
  | { status: "plain"; text: string }
  | { status: "unavailable" };

// Keyed by Deezer track id; persists for the tab's lifetime since lyrics for
// a given track never change.
const lyricsCache = new Map<number, LyricsState>();

export function useLyrics(track: PlayerTrack | null): LyricsState {
  const [state, setState] = useState<LyricsState>({ status: "idle" });

  useEffect(() => {
    if (!track) {
      setState({ status: "idle" });
      return;
    }

    const cached = lyricsCache.get(track.id);
    if (cached) {
      setState(cached);
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const params = new URLSearchParams({
      track: track.title,
      artist: track.artist,
      album: track.album,
      duration: String(Math.round(track.duration)),
    });

    fetch(`/api/lyrics?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            instrumental?: boolean;
            plainLyrics?: string | null;
            syncedLyrics?: string | null;
          } | null,
        ) => {
          if (cancelled) return;

          let next: LyricsState;
          if (!data || data.instrumental) {
            next = { status: "unavailable" };
          } else if (data.syncedLyrics) {
            const lines = parseLrc(data.syncedLyrics);
            next =
              lines.length > 0
                ? { status: "synced", lines }
                : { status: "unavailable" };
          } else if (data.plainLyrics) {
            next = { status: "plain", text: data.plainLyrics };
          } else {
            next = { status: "unavailable" };
          }

          lyricsCache.set(track.id, next);
          setState(next);
        },
      )
      .catch(() => {
        if (!cancelled) setState({ status: "unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, [track]);

  return state;
}
