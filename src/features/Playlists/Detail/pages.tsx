"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, TrashIcon } from "@/components/icons";
import { TrackList, type TrackListItem } from "@/components/track-list";
import {
  deletePlaylist,
  removeTrackFromPlaylist,
  renamePlaylist,
} from "@/features/Playlists/actions";
import { useLikeToggle } from "@/features/shared/use-like-toggle";
import type { DeezerTrack } from "@/lib/deezer";

export type PlaylistTrackItem = DeezerTrack & { rowKey: string };

export default function PlaylistDetailPage({
  playlistId,
  initialName,
  tracks,
  initialLikedTrackIds,
}: {
  playlistId: string;
  initialName: string;
  tracks: PlaylistTrackItem[];
  initialLikedTrackIds: number[];
}) {
  const router = useRouter();
  const { likedTrackIds, toggleLike } = useLikeToggle(initialLikedTrackIds);
  const [name, setName] = useState(initialName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [rows, setRows] = useState(tracks);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  async function handleRenameSubmit() {
    setIsEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) {
      setName(initialName);
      return;
    }
    await renamePlaylist(playlistId, trimmed);
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer la playlist « ${name} » ?`)) return;
    await deletePlaylist(playlistId);
    router.push("/playlists");
  }

  async function handleRemoveTrack(track: TrackListItem) {
    if (!track.rowKey) return;
    const rowKey = track.rowKey;
    setRows((prev) => prev.filter((row) => row.rowKey !== rowKey));
    try {
      await removeTrackFromPlaylist(rowKey);
    } catch {
      setRows(tracks);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/playlists"
        className="flex w-fit items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex items-center justify-between gap-3">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleRenameSubmit();
              }
            }}
            className="w-full rounded-lg border border-brand bg-surface px-2 py-1 text-xl font-semibold text-white outline-none sm:text-2xl"
          />
        ) : (
          <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="max-w-full cursor-text truncate text-left"
            >
              {name}
            </button>
          </h1>
        )}
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Supprimer la playlist"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-white/60 transition hover:border-red-400 hover:text-red-400"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/40">
          Cette playlist est vide. Ajoutez des titres depuis la recherche ou
          votre bibliothèque.
        </p>
      ) : (
        <TrackList
          tracks={rows}
          likedTrackIds={likedTrackIds}
          onToggleLike={toggleLike}
          onRemove={handleRemoveTrack}
        />
      )}
    </div>
  );
}
