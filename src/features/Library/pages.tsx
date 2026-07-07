"use client";

import type { LikedTrack } from "!/prisma_db";
import { useState } from "react";
import {
  TrackList,
  type TrackListItem,
  toPlayerTrack,
} from "@/components/track-list";
import { unlikeTrack } from "@/features/Library/actions";
import { ContextPlayControls } from "@/features/Player/components/context-play-controls";

const QUEUE_CONTEXT_ID = "liked";

function toTrackListItem(track: LikedTrack): TrackListItem {
  return {
    id: track.deezerTrackId,
    rowKey: track.id,
    title: track.title,
    duration: track.duration,
    artist: { name: track.artistName },
    album: { title: track.albumTitle, cover_medium: track.albumCover },
  };
}

export default function LibraryPage({
  likedTracks,
}: {
  likedTracks: LikedTrack[];
}) {
  const [rows, setRows] = useState(() => likedTracks.map(toTrackListItem));

  async function handleUnlike(track: TrackListItem) {
    setRows((prev) => prev.filter((row) => row.id !== track.id));
    try {
      await unlikeTrack(track.id);
    } catch {
      setRows(likedTracks.map(toTrackListItem));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Titres likés</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-white/40">
          Vous n'avez encore aimé aucun titre. Cherchez de la musique et cliquez
          sur le cœur pour l'ajouter ici.
        </p>
      ) : (
        <>
          <ContextPlayControls
            contextId={QUEUE_CONTEXT_ID}
            tracks={rows.map(toPlayerTrack)}
          />
          <TrackList
            tracks={rows}
            likedTrackIds={new Set(rows.map((row) => row.id))}
            onToggleLike={handleUnlike}
            queueContextId={QUEUE_CONTEXT_ID}
          />
        </>
      )}
    </div>
  );
}
