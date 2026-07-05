import Image from "next/image";
import { HeartIcon } from "@/components/icons";
import type { DeezerTrack } from "@/lib/deezer";

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackList({
  tracks,
  likedTrackIds,
  onToggleLike,
}: {
  tracks: DeezerTrack[];
  likedTrackIds: Set<number>;
  onToggleLike: (track: DeezerTrack) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {tracks.map((track) => {
        const isLiked = likedTrackIds.has(track.id);
        return (
          <li key={track.id} className="flex items-center gap-3 py-2.5">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
              <Image
                src={track.album.cover_medium}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {track.title}
              </p>
              <p className="truncate text-xs text-white/50">
                {track.artist.name}
              </p>
            </div>
            <span className="shrink-0 text-xs text-white/40">
              {formatDuration(track.duration)}
            </span>
            <button
              type="button"
              onClick={() => onToggleLike(track)}
              aria-label={
                isLiked
                  ? "Retirer des titres likés"
                  : "Ajouter aux titres likés"
              }
              className={`shrink-0 transition hover:text-brand ${isLiked ? "text-brand" : "text-white/40"}`}
            >
              <HeartIcon
                className="h-5 w-5"
                fill={isLiked ? "currentColor" : "none"}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
