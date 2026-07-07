"use client";

import { useEffect, useRef } from "react";
import type { PlayerTrack } from "@/features/Player/player-context";

const SEEK_OFFSET_SECONDS = 10;
const MEDIA_SESSION_ACTIONS = [
  "play",
  "pause",
  "previoustrack",
  "nexttrack",
  "seekto",
  "seekbackward",
  "seekforward",
] as const satisfies readonly MediaSessionAction[];

function isSupported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

// Wires playback state into the OS-level media notification (Android/Chrome
// lock screen + Bluetooth AVRCP controls, e.g. a car head unit). This is also
// what keeps Chrome treating the tab as active media playback in the
// background, so audio doesn't get suspended when the screen locks.
export function useMediaSession({
  track,
  isPlaying,
  duration,
  currentTime,
  canSkipNext,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
}: {
  track: PlayerTrack | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  canSkipNext: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
}) {
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (!isSupported()) return;
    navigator.mediaSession.metadata = track
      ? new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album,
          artwork: [{ src: track.cover, sizes: "250x250", type: "image/jpeg" }],
        })
      : null;
  }, [track]);

  useEffect(() => {
    if (!isSupported()) return;
    navigator.mediaSession.playbackState = !track
      ? "none"
      : isPlaying
        ? "playing"
        : "paused";
  }, [track, isPlaying]);

  useEffect(() => {
    if (!isSupported() || !navigator.mediaSession.setPositionState) return;
    if (!track || !Number.isFinite(duration) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(Math.max(currentTime, 0), duration),
      });
    } catch {
      // Can throw if position momentarily exceeds a stale duration during a
      // track transition; the next tick corrects it, so it's safe to drop.
    }
  }, [track, duration, currentTime]);

  useEffect(() => {
    if (!isSupported()) return;

    navigator.mediaSession.setActionHandler("play", onPlay);
    navigator.mediaSession.setActionHandler("pause", onPause);
    navigator.mediaSession.setActionHandler("previoustrack", onPrevious);
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      canSkipNext ? onNext : null,
    );
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime != null) onSeek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const offset = details.seekOffset ?? SEEK_OFFSET_SECONDS;
      onSeek(Math.max(0, currentTimeRef.current - offset));
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const offset = details.seekOffset ?? SEEK_OFFSET_SECONDS;
      onSeek(Math.min(durationRef.current, currentTimeRef.current + offset));
    });

    return () => {
      for (const action of MEDIA_SESSION_ACTIONS) {
        navigator.mediaSession.setActionHandler(action, null);
      }
    };
  }, [onPlay, onPause, onPrevious, onNext, canSkipNext, onSeek]);
}
