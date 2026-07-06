import type { LikedTrack } from "!/prisma_db";
import Image from "next/image";
import { unlikeTrack } from "@/features/Library/actions";
import { TrackPlayButton } from "@/features/Player/components/track-play-button";
import { AddToPlaylistMenu } from "@/features/Playlists/components/add-to-playlist-menu";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function LibraryPage({
  likedTracks,
}: {
  likedTracks: LikedTrack[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Titres likés</h1>

      {likedTracks.length === 0 ? (
        <p className="text-sm text-white/40">
          Vous n'avez encore aimé aucun titre. Cherchez de la musique et cliquez
          sur le cœur pour l'ajouter ici.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {likedTracks.map((track) => (
            <li key={track.id} className="flex items-center gap-3 py-2.5">
              <div className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
                <Image
                  src={track.albumCover}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
                <TrackPlayButton
                  track={{
                    id: track.deezerTrackId,
                    title: track.title,
                    artist: track.artistName,
                    cover: track.albumCover,
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {track.title}
                </p>
                <p className="truncate text-xs text-white/50">
                  {track.artistName}
                </p>
              </div>
              <span className="shrink-0 text-xs text-white/40">
                {formatDuration(track.duration)}
              </span>
              <AddToPlaylistMenu
                track={{
                  id: track.deezerTrackId,
                  title: track.title,
                  duration: track.duration,
                  artist: { name: track.artistName },
                  album: {
                    title: track.albumTitle,
                    cover_medium: track.albumCover,
                  },
                }}
              />
              <form action={unlikeTrack.bind(null, track.deezerTrackId)}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-white/60 transition hover:border-brand hover:text-white"
                >
                  Retirer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
