"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlaylistIcon, PlusIcon } from "@/components/icons";
import { createPlaylist } from "@/features/Playlists/actions";

export type PlaylistSummary = {
  id: string;
  name: string;
  trackCount: number;
  covers: string[];
};

function PlaylistCover({ covers }: { covers: string[] }) {
  if (covers.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-elevated">
        <PlaylistIcon className="h-8 w-8 text-white/30" />
      </div>
    );
  }

  if (covers.length === 1) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-md">
        <Image
          src={covers[0]}
          alt=""
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-md">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`${covers[index] ?? "empty"}-${index}`}
          className="relative bg-surface-elevated"
        >
          {covers[index] && (
            <Image
              src={covers[index]}
              alt=""
              fill
              sizes="12vw"
              className="object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function PlaylistsPage({
  playlists,
}: {
  playlists: PlaylistSummary[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    try {
      const playlist = await createPlaylist(trimmed);
      router.push(`/playlists/${playlist.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Playlists</h1>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Nom de la nouvelle playlist"
          className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" />
          Créer
        </button>
      </div>

      {playlists.length === 0 ? (
        <p className="text-sm text-white/40">
          Vous n'avez encore aucune playlist. Créez-en une pour commencer à
          organiser votre musique.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              href={`/playlists/${playlist.id}`}
              className="flex flex-col gap-2 rounded-lg p-2 transition hover:bg-surface-elevated"
            >
              <PlaylistCover covers={playlist.covers} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {playlist.name}
                </p>
                <p className="truncate text-xs text-white/50">
                  {playlist.trackCount} titres
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
