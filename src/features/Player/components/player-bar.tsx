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

function Slider({
  value,
  max,
  step,
  onChange,
  disabled = false,
  ariaLabel,
  className = "",
}: {
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className={`relative flex h-5 shrink-0 items-center ${disabled ? "opacity-0" : ""} ${className}`}
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${percent}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer touch-none appearance-none bg-transparent opacity-0 disabled:cursor-default"
      />
    </div>
  );
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
      <div className="flex flex-col gap-2 px-4 py-3">
        <Slider
          value={Math.min(currentTime, hasDuration ? duration : 0)}
          max={hasDuration ? duration : 1}
          step={0.1}
          onChange={seek}
          disabled={!currentTrack || !hasDuration}
          ariaLabel="Progression du titre"
          className="w-full"
        />

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
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
                  : (currentTrack?.artist ?? " ")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition disabled:opacity-30 enabled:hover:scale-105"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            ) : isPlaying ? (
              <PauseIcon className="h-4 w-4" />
            ) : (
              <PlayIcon className="h-4 w-4 translate-x-0.5" />
            )}
          </button>

          <div className="flex min-w-0 items-center justify-end gap-3">
            <span className="shrink-0 text-xs text-white/40 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
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
              <Slider
                value={volume}
                max={MAX_VOLUME}
                step={1}
                onChange={setVolume}
                ariaLabel="Volume"
                className="w-24"
              />
              <span className="w-9 shrink-0 text-right text-xs text-white/40 tabular-nums">
                {volume}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
