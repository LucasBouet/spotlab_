"use client";

import Image from "next/image";
import { HeartIcon, XIcon } from "@/components/icons";
import { TrackPlayButton } from "@/features/Player/components/track-play-button";
import { TrackQueueMenu } from "@/features/Player/components/track-queue-menu";
import { type PlayerTrack, usePlayer } from "@/features/Player/player-context";
import { AddToPlaylistMenu } from "@/features/Playlists/components/add-to-playlist-menu";
import type { DeezerTrack } from "@/lib/deezer";

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export type TrackListItem = DeezerTrack & { rowKey?: string };

export function toPlayerTrack(track: DeezerTrack): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist.name,
    album: track.album.title,
    cover: track.album.cover_medium,
    duration: track.duration,
  };
}

export function TrackList({
  tracks,
  likedTrackIds,
  onToggleLike,
  onRemove,
  removeLabel = "Retirer de la playlist",
  queueContextId,
}: {
  tracks: TrackListItem[];
  likedTrackIds: Set<number>;
  onToggleLike: (track: DeezerTrack) => void;
  onRemove?: (track: TrackListItem) => void;
  removeLabel?: string;
  queueContextId?: string;
}) {
  const { playContext } = usePlayer();
  const playerTracks = tracks.map(toPlayerTrack);

  return (
    <ul className="flex flex-col divide-y divide-border">
      {tracks.map((track, index) => {
        const isLiked = likedTrackIds.has(track.id);
        const playerTrack = playerTracks[index];
        return (
          <li
            key={track.rowKey ?? track.id}
            className="flex items-center gap-3 py-2.5"
          >
            <div className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
              <Image
                src={track.album.cover_medium}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
              <TrackPlayButton
                track={playerTrack}
                onPlay={
                  queueContextId
                    ? () => playContext(queueContextId, playerTracks, index)
                    : undefined
                }
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
            <AddToPlaylistMenu track={track} />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(track)}
                aria-label={removeLabel}
                className="shrink-0 text-white/40 transition hover:text-red-400"
              >
                <XIcon className="h-5 w-5" />
              </button>
            )}
            <TrackQueueMenu track={playerTrack} />
          </li>
        );
      })}
    </ul>
  );
}
