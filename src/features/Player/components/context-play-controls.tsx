"use client";

import { PauseIcon, PlayIcon, ShuffleIcon } from "@/components/icons";
import { type PlayerTrack, usePlayer } from "@/features/Player/player-context";

export function ContextPlayControls({
  contextId,
  tracks,
}: {
  contextId: string;
  tracks: PlayerTrack[];
}) {
  const {
    activeContextId,
    status,
    shuffle,
    playContext,
    togglePlay,
    toggleShuffle,
  } = usePlayer();
  const isActive = activeContextId === contextId;
  const isPlaying = isActive && status === "playing";
  const disabled = tracks.length === 0;

  function handlePlay() {
    if (disabled) return;
    if (isActive) {
      togglePlay();
      return;
    }
    playContext(contextId, tracks, 0);
  }

  function handleShuffle() {
    if (disabled) return;
    if (isActive) {
      toggleShuffle();
      return;
    }
    const startIndex = Math.floor(Math.random() * tracks.length);
    playContext(contextId, tracks, startIndex, { shuffle: true });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handlePlay}
        disabled={disabled}
        aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-lg transition disabled:opacity-40 enabled:hover:scale-105 enabled:hover:bg-brand-hover"
      >
        {isPlaying ? (
          <PauseIcon className="h-5 w-5" />
        ) : (
          <PlayIcon className="h-5 w-5 translate-x-0.5" />
        )}
      </button>
      <button
        type="button"
        onClick={handleShuffle}
        disabled={disabled}
        aria-pressed={isActive && shuffle}
        aria-label="Lecture aléatoire"
        className={`flex shrink-0 items-center justify-center rounded-full p-2 transition disabled:opacity-40 ${
          isActive && shuffle
            ? "bg-brand/20 text-brand"
            : "text-white/60 hover:text-white"
        }`}
      >
        <ShuffleIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
