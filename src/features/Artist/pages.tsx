"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { TrackList } from "@/components/track-list";
import { useLikeToggle } from "@/features/shared/use-like-toggle";
import type { DeezerArtistDetail, DeezerTrack } from "@/lib/deezer";

function formatCount(count: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(count);
}

export default function ArtistPage({
  artist,
  topTracks,
  initialLikedTrackIds,
}: {
  artist: DeezerArtistDetail;
  topTracks: DeezerTrack[];
  initialLikedTrackIds: number[];
}) {
  const { likedTrackIds, toggleLike } = useLikeToggle(initialLikedTrackIds);

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
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-surface-elevated sm:h-36 sm:w-36">
          <Image
            src={artist.picture_medium}
            alt=""
            fill
            sizes="144px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-white sm:text-2xl">
            {artist.name}
          </h1>
          {typeof artist.nb_fan === "number" && (
            <p className="text-sm text-white/60">
              {formatCount(artist.nb_fan)} fans
            </p>
          )}
          {typeof artist.nb_album === "number" && (
            <p className="text-xs text-white/40">{artist.nb_album} albums</p>
          )}
        </div>
      </div>

      {topTracks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-white/70">
            Titres populaires
          </h2>
          <TrackList
            tracks={topTracks}
            likedTrackIds={likedTrackIds}
            onToggleLike={toggleLike}
          />
        </div>
      )}
    </div>
  );
}
