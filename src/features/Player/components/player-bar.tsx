"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  PauseIcon,
  PlayIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/icons";
import { MAX_VOLUME, usePlayer } from "@/features/Player/player-context";

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    currentTrack,
    status,
    currentTime,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
  } = usePlayer();
  const previousVolumeRef = useRef(volume || 100);

  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const hasDuration = duration > 0;

  function toggleMute() {
    if (volume > 0) {
      previousVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(previousVolumeRef.current || 100);
    }
  }

  return (
    <div className="border-t border-border bg-surface/95 backdrop-blur">
      <input
        type="range"
        min={0}
        max={hasDuration ? duration : 1}
        step={0.1}
        value={Math.min(currentTime, hasDuration ? duration : 0)}
        onChange={(event) => seek(Number(event.target.value))}
        disabled={!currentTrack || !hasDuration}
        aria-label="Progression du titre"
        className="h-1 w-full cursor-pointer accent-brand disabled:cursor-default"
      />
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
          {currentTrack && (
            <Image
              src={currentTrack.cover}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {currentTrack?.title ?? "Aucun titre en cours de lecture"}
          </p>
          <p className="truncate text-xs text-white/50">
            {status === "error"
              ? "Erreur de lecture"
              : (currentTrack?.artist ?? " ")}
          </p>
        </div>
        <span className="hidden shrink-0 text-xs text-white/40 tabular-nums sm:block">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!currentTrack}
          aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition disabled:opacity-30 enabled:hover:scale-105"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          ) : isPlaying ? (
            <PauseIcon className="h-4 w-4" />
          ) : (
            <PlayIcon className="h-4 w-4 translate-x-0.5" />
          )}
        </button>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={volume === 0 ? "Réactiver le son" : "Couper le son"}
            className="text-white/60 transition hover:text-white"
          >
            {volume === 0 ? (
              <VolumeMuteIcon className="h-4 w-4" />
            ) : (
              <VolumeIcon className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={MAX_VOLUME}
            step={1}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Volume"
            className="h-1 w-24 cursor-pointer accent-brand"
          />
          <span className="w-9 shrink-0 text-right text-xs text-white/40 tabular-nums">
            {volume}%
          </span>
        </div>
      </div>
    </div>
  );
}
