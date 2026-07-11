"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  HeartIcon,
  PauseIcon,
  PlayIcon,
  ShuffleIcon,
  SkipNextIcon,
  SkipPreviousIcon,
  VolumeIcon,
  VolumeMuteIcon,
  XIcon,
} from "@/components/icons";
import {
  isTrackLiked,
  likeTrack,
  unlikeTrack,
} from "@/features/Library/actions";
import { formatTime, Slider } from "@/features/Player/components/player-bar";
import { downloadTrack } from "@/features/Player/download-track";
import { MAX_VOLUME, usePlayer } from "@/features/Player/player-context";

// How far down the sheet has to be dragged (in px) before a release is
// treated as "close" rather than "snap back open".
const CLOSE_DRAG_DISTANCE = 120;

export function NowPlayingView() {
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
    isFullscreenOpen,
    closeFullscreen,
  } = usePlayer();

  const previousVolumeRef = useRef(volume || 100);
  const [isLiked, setIsLiked] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const hasDuration = duration > 0;

  useEffect(() => {
    if (!isFullscreenOpen || !currentTrack) {
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
  }, [currentTrack, isFullscreenOpen]);

  useEffect(() => {
    if (!isFullscreenOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeFullscreen();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenOpen, closeFullscreen]);

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

  function handleTouchStart(event: React.TouchEvent) {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, a")) return;
    touchStartYRef.current = event.touches[0].clientY;
    setIsDragging(true);
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (touchStartYRef.current === null) return;
    const delta = event.touches[0].clientY - touchStartYRef.current;
    if (delta > 0) setDragY(delta);
  }

  function handleTouchEnd() {
    if (touchStartYRef.current === null) return;
    touchStartYRef.current = null;
    setIsDragging(false);
    if (dragY > CLOSE_DRAG_DISTANCE) {
      closeFullscreen();
    }
    setDragY(0);
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col overflow-hidden bg-surface duration-300 ease-out ${
        isDragging ? "" : "transition-transform"
      } ${isFullscreenOpen ? "translate-y-0" : "translate-y-full"}`}
      style={isDragging ? { transform: `translateY(${dragY}px)` } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Lecture en cours"
      inert={isFullscreenOpen ? undefined : true}
    >
      {currentTrack?.cover && (
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Image
            src={currentTrack.cover}
            alt=""
            fill
            sizes="100vw"
            className="scale-110 object-cover opacity-40 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-surface/85 to-surface" />
        </div>
      )}

      <div
        className="relative flex shrink-0 items-center justify-end px-4 pb-2 sm:px-8"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <span
          className="-translate-x-1/2 absolute top-2 left-1/2 h-1 w-10 rounded-full bg-white/20 sm:hidden"
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={closeFullscreen}
          aria-label="Fermer"
          className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 pb-8 sm:gap-8">
        <div className="relative aspect-square w-full max-w-[min(80vw,420px)] shrink-0 overflow-hidden rounded-2xl bg-surface-elevated shadow-2xl sm:max-w-[440px]">
          {currentTrack?.cover && (
            <Image
              src={currentTrack.cover}
              alt=""
              fill
              sizes="(max-width: 640px) 80vw, 440px"
              className="object-cover"
              priority
            />
          )}
        </div>

        <div className="w-full max-w-[min(80vw,420px)] shrink-0 sm:max-w-[440px]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold text-white sm:text-2xl">
                {currentTrack?.title ?? "Aucun titre en cours de lecture"}
              </p>
              <p className="truncate text-sm text-white/60 sm:text-base">
                {status === "error"
                  ? "Erreur de lecture"
                  : (currentTrack?.artist ?? " ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={!currentTrack}
                aria-label={
                  isLiked
                    ? "Retirer des titres likés"
                    : "Ajouter aux titres likés"
                }
                className={`flex items-center justify-center rounded-full p-2 transition hover:text-brand disabled:opacity-30 ${isLiked ? "text-brand" : "text-white/60"}`}
              >
                <HeartIcon
                  className="h-6 w-6"
                  fill={isLiked ? "currentColor" : "none"}
                />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!currentTrack || isDownloading}
                aria-label="Télécharger le titre"
                className="flex items-center justify-center rounded-full p-2 text-white/60 transition hover:text-white disabled:opacity-30"
              >
                {isDownloading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <DownloadIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-1.5">
            <Slider
              value={Math.min(currentTime, hasDuration ? duration : 0)}
              max={hasDuration ? duration : 1}
              step={0.1}
              onChange={seek}
              disabled={!currentTrack || !hasDuration}
              ariaLabel="Progression du titre"
              trackClassName="h-1.5"
            />
            <div className="flex items-center justify-between text-xs text-white/40 tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 sm:gap-8">
            <button
              type="button"
              onClick={toggleShuffle}
              disabled={!currentTrack}
              aria-pressed={shuffle}
              aria-label="Lecture aléatoire"
              className={`flex shrink-0 items-center justify-center rounded-full p-2 transition disabled:opacity-30 ${
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
              <SkipPreviousIcon className="h-8 w-8" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!currentTrack}
              aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-black transition disabled:opacity-30 enabled:hover:scale-105"
            >
              {isLoading ? (
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              ) : isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6 translate-x-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={skipNext}
              disabled={queue.length === 0}
              aria-label="Titre suivant"
              className="text-white/70 transition hover:text-white disabled:opacity-30"
            >
              <SkipNextIcon className="h-8 w-8" />
            </button>
            <div className="h-5 w-5 shrink-0" aria-hidden="true" />
          </div>

          <div className="mt-8 hidden items-center gap-3 sm:flex">
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
              className="w-full"
              trackClassName="h-1.5"
            />
            <span className="w-9 shrink-0 text-right text-xs text-white/40 tabular-nums">
              {volume}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
