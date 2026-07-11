"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  ExpandIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  ShuffleIcon,
  SkipNextIcon,
  SkipPreviousIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/icons";
import {
  isTrackLiked,
  likeTrack,
  unlikeTrack,
} from "@/features/Library/actions";
import { downloadTrack } from "@/features/Player/download-track";
import { MAX_VOLUME, usePlayer } from "@/features/Player/player-context";

export function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// A vertical swipe steeper than this (relative to the horizontal component)
// starting on the bar is treated as "open fullscreen" rather than a scrub of
// the progress slider or an accidental drag.
const SWIPE_UP_DISTANCE = 48;
const SWIPE_UP_RATIO = 1.5;

export function Slider({
  value,
  max,
  step,
  onChange,
  disabled = false,
  ariaLabel,
  className = "",
  trackClassName = "h-1",
}: {
  value: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  trackClassName?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      className={`relative flex h-5 shrink-0 items-center ${disabled ? "opacity-0" : ""} ${className}`}
    >
      <div
        className={`w-full overflow-hidden rounded-full bg-white/15 ${trackClassName}`}
      >
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
    shuffle,
    toggleShuffle,
    skipNext,
    skipPrevious,
    queue,
    isQueueOpen,
    toggleQueuePanel,
    openFullscreen,
  } = usePlayer();
  const previousVolumeRef = useRef(volume || 100);
  const [isLiked, setIsLiked] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const hasDuration = duration > 0;

  useEffect(() => {
    if (!currentTrack) {
      setIsLiked(false);
      return;
    }
    let cancelled = false;
    isTrackLiked(currentTrack.id).then((liked) => {
      if (!cancelled) setIsLiked(liked);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  function toggleMute() {
    if (volume > 0) {
      previousVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(previousVolumeRef.current || 100);
    }
  }

  async function handleDownload() {
    if (!currentTrack || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadTrack(currentTrack);
    } catch {
      // Le téléchargement a échoué ; l'utilisateur peut réessayer.
    } finally {
      setIsDownloading(false);
    }
  }

  function handleTouchStart(event: React.TouchEvent) {
    if (!currentTrack) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !currentTrack) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (
      deltaY < -SWIPE_UP_DISTANCE &&
      Math.abs(deltaY) > Math.abs(deltaX) * SWIPE_UP_RATIO
    ) {
      openFullscreen();
    }
  }

  async function handleToggleLike() {
    if (!currentTrack) return;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    try {
      if (nextLiked) {
        await likeTrack({
          deezerTrackId: currentTrack.id,
          title: currentTrack.title,
          artistName: currentTrack.artist,
          albumTitle: currentTrack.album,
          albumCover: currentTrack.cover,
          duration: currentTrack.duration,
        });
      } else {
        await unlikeTrack(currentTrack.id);
      }
    } catch {
      setIsLiked(!nextLiked);
    }
  }

  return (
    <div
      className="border-t border-border bg-surface/95 backdrop-blur"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null;
      }}
    >
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
              {currentTrack?.cover && (
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
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={!currentTrack}
              aria-label={
                isLiked
                  ? "Retirer des titres likés"
                  : "Ajouter aux titres likés"
              }
              className={`shrink-0 transition hover:text-brand disabled:opacity-30 ${isLiked ? "text-brand" : "text-white/40"}`}
            >
              <HeartIcon
                className="h-5 w-5"
                fill={isLiked ? "currentColor" : "none"}
              />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={toggleShuffle}
              disabled={!currentTrack}
              aria-pressed={shuffle}
              aria-label="Lecture aléatoire"
              className={`hidden shrink-0 items-center justify-center rounded-full p-1.5 transition disabled:opacity-30 sm:flex ${
                shuffle
                  ? "bg-brand/20 text-brand"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <ShuffleIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={skipPrevious}
              disabled={!currentTrack}
              aria-label="Titre précédent"
              className="text-white/70 transition hover:text-white disabled:opacity-30"
            >
              <SkipPreviousIcon className="h-6 w-6" />
            </button>
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
            <button
              type="button"
              onClick={skipNext}
              disabled={queue.length === 0}
              aria-label="Titre suivant"
              className="text-white/70 transition hover:text-white disabled:opacity-30"
            >
              <SkipNextIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-3">
            <span className="hidden shrink-0 text-xs text-white/40 tabular-nums sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!currentTrack || isDownloading}
              aria-label="Télécharger le titre"
              className="flex shrink-0 items-center justify-center rounded-full p-1.5 text-white/80 transition hover:text-white disabled:opacity-30"
            >
              {isDownloading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <DownloadIcon className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={openFullscreen}
              disabled={!currentTrack}
              aria-label="Plein écran"
              className="hidden shrink-0 items-center justify-center rounded-full p-1.5 text-white/60 transition hover:text-white disabled:opacity-30 sm:flex"
            >
              <ExpandIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleQueuePanel}
              aria-pressed={isQueueOpen}
              aria-label="File d'attente"
              className={`flex shrink-0 items-center justify-center rounded-full p-1.5 transition ${isQueueOpen ? "bg-brand/20 text-brand" : "text-white/60 hover:text-white"}`}
            >
              <QueueIcon className="h-5 w-5" />
            </button>
            <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={volume === 0 ? "Réactiver le son" : "Couper le son"}
                className="text-white/60 transition hover:text-white"
              >
                {volume === 0 ? (
                  <VolumeMuteIcon className="h-5 w-5" />
                ) : (
                  <VolumeIcon className="h-5 w-5" />
                )}
              </button>
              <Slider
                value={volume}
                max={MAX_VOLUME}
                step={1}
                onChange={setVolume}
                ariaLabel="Volume"
                className="w-40"
                trackClassName="h-1.5"
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
