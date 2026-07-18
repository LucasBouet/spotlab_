"use client";

import { useEffect, useRef } from "react";
import type { PlayerStatus } from "@/features/Player/player-context";
import type { QueueItem } from "@/features/Player/queue-reducer";

// A play "counts" once the track has actually been heard for this long. At that
// point it's logged once and its *full* duration is credited to the listening
// total — a deliberate Last.fm-style rule (30s in ≈ played) chosen for the
// stats, not an accurate seconds-listened measure.
const SCROBBLE_THRESHOLD_MS = 30_000;

function logPlay(track: QueueItem) {
  fetch("/api/plays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deezerTrackId: track.id,
      title: track.title,
      artistName: track.artist,
      albumTitle: track.album,
      albumCover: track.cover,
      duration: track.duration,
    }),
    // Survives the tab being closed right after the threshold fires.
    keepalive: true,
  }).catch(() => {});
}

// Records a qualified play once the current track has accumulated
// SCROBBLE_THRESHOLD_MS of *real* playback on this device. Only the primary
// output device runs this (see isPrimaryOutput in the provider) so multi-output
// or remote-control setups don't double-count the same listen. Timeout-driven
// rather than a per-second interval, so playing a track costs nothing extra on
// low-end devices between the start and the single threshold fire.
export function usePlayTracking({
  track,
  status,
  isPrimaryOutput,
}: {
  track: QueueItem | null;
  status: PlayerStatus;
  isPrimaryOutput: boolean;
}) {
  // Real playback banked so far for the *current* queue item, plus whether it's
  // already been logged. Keyed to the item's uid so a fresh play — even of the
  // same song (a new uid) — restarts the count and can be logged again.
  const accRef = useRef<{ uid: string | null; ms: number; logged: boolean }>({
    uid: null,
    ms: 0,
    logged: false,
  });

  const uid = track?.uid ?? null;

  useEffect(() => {
    if (!isPrimaryOutput || !track || uid === null) return;

    if (accRef.current.uid !== uid) {
      accRef.current = { uid, ms: 0, logged: false };
    }
    if (accRef.current.logged || status !== "playing") return;

    const startedAt = Date.now();
    const remaining = SCROBBLE_THRESHOLD_MS - accRef.current.ms;
    const timer = setTimeout(
      () => {
        accRef.current.logged = true;
        logPlay(track);
      },
      Math.max(0, remaining),
    );

    return () => {
      clearTimeout(timer);
      // Bank the time spent playing in this stretch so a pause/seek/buffer
      // doesn't throw away progress toward the threshold.
      accRef.current.ms += Date.now() - startedAt;
    };
  }, [uid, status, isPrimaryOutput, track]);
}
