"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { TrackList, toPlayerTrack } from "@/components/track-list";
import { ContextPlayControls } from "@/features/Player/components/context-play-controls";
import { useLikeToggle } from "@/features/shared/use-like-toggle";
import type { DeezerAlbumDetail, DeezerTrack } from "@/lib/deezer";

export default function AlbumPage({
  album,
  initialLikedTrackIds,
}: {
  album: DeezerAlbumDetail;
  initialLikedTrackIds: number[];
}) {
  const { likedTrackIds, toggleLike } = useLikeToggle(initialLikedTrackIds);
  const contextId = `album:${album.id}`;

  const tracks: DeezerTrack[] = album.tracks.data.map((track) => ({
    ...track,
    album: { title: album.title, cover_medium: album.cover_medium },
  }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/search"
        className="flex w-fit items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-elevated sm:h-36 sm:w-36">
          {album.cover_medium && (
            <Image
              src={album.cover_medium}
              alt=""
              fill
              sizes="144px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-white/50 uppercase">
            {album.record_type}
          </p>
          <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
            {album.title}
          </h1>
          <p className="truncate text-sm text-white/60">{album.artist.name}</p>
          <p className="text-xs text-white/40">{album.nb_tracks} titres</p>
        </div>
      </div>

      <ContextPlayControls
        contextId={contextId}
        tracks={tracks.map(toPlayerTrack)}
      />

      <TrackList
        tracks={tracks}
        likedTrackIds={likedTrackIds}
        onToggleLike={toggleLike}
        queueContextId={contextId}
      />
    </div>
  );
}
