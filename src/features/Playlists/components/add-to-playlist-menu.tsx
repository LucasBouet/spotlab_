"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, PlusIcon } from "@/components/icons";
import {
  addTrackToPlaylist,
  createPlaylist,
  getPlaylistMembership,
  togglePlaylistTrack,
} from "@/features/Playlists/actions";
import type { DeezerTrack } from "@/lib/deezer";

type PlaylistOption = { id: string; name: string; hasTrack: boolean };

export function AddToPlaylistMenu({ track }: { track: DeezerTrack }) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistOption[] | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function open() {
    setIsOpen((prev) => !prev);
    if (playlists === null) {
      const membership = await getPlaylistMembership(track.id);
      setPlaylists(membership);
    }
  }

  const trackInput = {
    deezerTrackId: track.id,
    title: track.title,
    artistName: track.artist.name,
    albumTitle: track.album.title,
    albumCover: track.album.cover_medium,
    duration: track.duration,
  };

  async function handleToggle(playlist: PlaylistOption) {
    setPlaylists(
      (prev) =>
        prev?.map((item) =>
          item.id === playlist.id
            ? { ...item, hasTrack: !item.hasTrack }
            : item,
        ) ?? null,
    );

    try {
      await togglePlaylistTrack(playlist.id, trackInput);
    } catch {
      setPlaylists(
        (prev) =>
          prev?.map((item) =>
            item.id === playlist.id
              ? { ...item, hasTrack: playlist.hasTrack }
              : item,
          ) ?? null,
      );
    }
  }

  async function handleCreate() {
    const name = newPlaylistName.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    try {
      const playlist = await createPlaylist(name);
      await addTrackToPlaylist(playlist.id, trackInput);
      setPlaylists((prev) => [
        { ...playlist, hasTrack: true },
        ...(prev ?? []),
      ]);
      setNewPlaylistName("");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={open}
        aria-label="Ajouter à une playlist"
        className="text-white/40 transition hover:text-brand"
      >
        <PlusIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-30 mt-2 w-64 rounded-lg border border-border bg-surface-elevated p-2 shadow-lg">
          <p className="px-2 py-1 text-xs font-medium text-white/50">
            Ajouter à une playlist
          </p>

          <div className="max-h-48 overflow-y-auto">
            {playlists === null && (
              <p className="px-2 py-2 text-sm text-white/40">Chargement...</p>
            )}
            {playlists?.length === 0 && (
              <p className="px-2 py-2 text-sm text-white/40">
                Aucune playlist pour le moment.
              </p>
            )}
            {playlists?.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => handleToggle(playlist)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white transition hover:bg-surface"
              >
                <span className="truncate">{playlist.name}</span>
                {playlist.hasTrack && (
                  <CheckIcon className="h-4 w-4 shrink-0 text-brand" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-1.5 border-t border-border pt-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Nouvelle playlist"
              className="w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-white outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newPlaylistName.trim() || isCreating}
              className="shrink-0 rounded-md bg-brand px-2 py-1 text-xs font-medium text-white transition disabled:opacity-40"
            >
              Créer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
