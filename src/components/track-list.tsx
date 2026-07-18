"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useMemo, useRef, useState } from "react";
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

const INITIAL_VISIBLE = 100;
const LOAD_STEP = 100;

// Each row is memoized and receives only stable props (the callbacks below are
// the player context's stable identities; the play-state is reduced to a few
// booleans that stay constant for every row except the one being toggled). That
// means a volume drag, a queue edit, or a play/pause — all of which change the
// player context and force TrackList itself to re-render — re-render at most the
// one or two rows whose booleans actually flipped, instead of the whole (up to
// 100-item) list plus its images and menus.
type TrackRowProps = {
  track: TrackListItem;
  playerTrack: PlayerTrack;
  index: number;
  isLiked: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onActivate: (index: number, isCurrent: boolean) => void;
  onToggleLike: (track: DeezerTrack) => void;
  onRemove?: (track: TrackListItem) => void;
  removeLabel: string;
  queuePlayNext: (track: PlayerTrack) => void;
  queueAddToEnd: (track: PlayerTrack) => void;
};

const TrackRow = memo(function TrackRow({
  track,
  playerTrack,
  index,
  isLiked,
  isCurrent,
  isPlaying,
  isLoading,
  onActivate,
  onToggleLike,
  onRemove,
  removeLabel,
  queuePlayNext,
  queueAddToEnd,
}: TrackRowProps) {
  const activate = () => onActivate(index, isCurrent);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
        {track.album.cover_medium && (
          <Image
            src={track.album.cover_medium}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        )}
        <TrackPlayButton
          isCurrent={isCurrent}
          isPlaying={isPlaying}
          isLoading={isLoading}
          onClick={activate}
        />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={activate}
          className="block max-w-full truncate text-left text-sm font-medium text-white hover:underline"
        >
          {track.title}
        </button>
        {track.artist.id ? (
          <Link
            href={`/artist/${track.artist.id}`}
            className="block max-w-full truncate text-left text-xs text-white/50 transition hover:text-white hover:underline"
          >
            {track.artist.name}
          </Link>
        ) : (
          <p className="truncate text-xs text-white/50">{track.artist.name}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-white/40">
        {formatDuration(track.duration)}
      </span>
      <button
        type="button"
        onClick={() => onToggleLike(track)}
        aria-label={
          isLiked ? "Retirer des titres likés" : "Ajouter aux titres likés"
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
      <TrackQueueMenu
        track={playerTrack}
        queuePlayNext={queuePlayNext}
        queueAddToEnd={queueAddToEnd}
      />
    </li>
  );
});

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
  const {
    playContext,
    playTrack,
    togglePlay,
    currentTrack,
    status,
    queuePlayNext,
    queueAddToEnd,
  } = usePlayer();
  const playerTracks = useMemo(() => tracks.map(toPlayerTrack), [tracks]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Single stable handler shared by every row's cover button and title (both
  // mirror the same behaviour): toggle when it's already the current track,
  // otherwise start it — within its context when the list has one, so tapping
  // the title starts playback too. handy on mobile where the hover-reveal
  // overlay isn't discoverable.
  const handleActivate = useCallback(
    (index: number, isCurrent: boolean) => {
      if (isCurrent) {
        togglePlay();
        return;
      }
      const playerTrack = playerTracks[index];
      if (!playerTrack) return;
      if (queueContextId) {
        playContext(queueContextId, playerTracks, index);
      } else {
        playTrack(playerTrack);
      }
    },
    [playerTracks, queueContextId, playContext, playTrack, togglePlay],
  );

  const sentinelRef = useCallback((node: HTMLLIElement | null) => {
    observerRef.current?.disconnect();
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => count + LOAD_STEP);
        }
      },
      { rootMargin: "600px" },
    );
    observerRef.current.observe(node);
  }, []);

  const visibleTracks = tracks.slice(0, visibleCount);
  const currentId = currentTrack?.id ?? null;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {visibleTracks.map((track, index) => {
        const playerTrack = playerTracks[index];
        const isCurrent = currentId === playerTrack.id;
        return (
          <TrackRow
            key={track.rowKey ?? track.id}
            track={track}
            playerTrack={playerTrack}
            index={index}
            isLiked={likedTrackIds.has(track.id)}
            isCurrent={isCurrent}
            isPlaying={isCurrent && status === "playing"}
            isLoading={isCurrent && status === "loading"}
            onActivate={handleActivate}
            onToggleLike={onToggleLike}
            onRemove={onRemove}
            removeLabel={removeLabel}
            queuePlayNext={queuePlayNext}
            queueAddToEnd={queueAddToEnd}
          />
        );
      })}
      {visibleCount < tracks.length && (
        <li ref={sentinelRef} aria-hidden className="py-4 text-center">
          <span className="text-xs text-white/30">
            Chargement des titres suivants...
          </span>
        </li>
      )}
    </ul>
  );
}
