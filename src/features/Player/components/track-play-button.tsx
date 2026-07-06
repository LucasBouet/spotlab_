"use client";

import { PauseIcon, PlayIcon } from "@/components/icons";
import { type PlayerTrack, usePlayer } from "@/features/Player/player-context";

export function TrackPlayButton({ track }: { track: PlayerTrack }) {
  const { currentTrack, status, playTrack } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const isPlaying = isCurrent && status === "playing";
  const isLoading = isCurrent && status === "loading";

  return (
    <button
      type="button"
      onClick={() => playTrack(track)}
      aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
      className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 ${
        isCurrent ? "opacity-100" : ""
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg">
        {isLoading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
        ) : isPlaying ? (
          <PauseIcon className="h-4 w-4" />
        ) : (
          <PlayIcon className="h-4 w-4 translate-x-0.5" />
        )}
      </span>
    </button>
  );
}
