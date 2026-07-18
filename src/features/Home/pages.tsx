"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshIcon } from "@/components/icons";
import { TrackList } from "@/components/track-list";
import type {
  RecAlbum,
  Recommendations,
  RecWindow,
} from "@/features/Home/recommendations";
import { useLikeToggle } from "@/features/shared/use-like-toggle";

const WINDOWS: { id: RecWindow; label: string }[] = [
  { id: "day", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "all", label: "Depuis le début" },
];

const WINDOW_LABEL: Record<RecWindow, string> = {
  day: "aujourd'hui",
  week: "cette semaine",
  all: "tout l'historique",
};

function caption(data: Recommendations): string {
  if (data.effectiveWindow === "charts") {
    return "Les tendances du moment sur Deezer — écoutez un peu pour personnaliser vos suggestions.";
  }
  const base =
    data.basedOn.length > 0
      ? `D'après ${data.basedOn.slice(0, 3).join(", ")}`
      : "D'après vos écoutes";
  // The window we actually seeded from can be broader than the one selected
  // when recent history was thin — say so, so the results don't feel random.
  if (data.effectiveWindow !== data.window) {
    return `${base} — peu d'écoutes ${WINDOW_LABEL[data.window]}, élargi à ${WINDOW_LABEL[data.effectiveWindow]}.`;
  }
  return base;
}

function AlbumGrid({ albums }: { albums: RecAlbum[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {albums.map((album) => (
        <Link
          key={album.id}
          href={`/album/${album.id}`}
          className="flex flex-col gap-2 rounded-lg p-2 transition hover:bg-surface-elevated"
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-surface-elevated">
            {album.cover_medium && (
              <Image
                src={album.cover_medium}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {album.title}
            </p>
            <p className="truncate text-xs text-white/50">
              {album.artist.name}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="flex flex-col gap-2 p-2">
          <div className="aspect-square w-full animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-elevated" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-elevated" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage({
  initialLikedTrackIds,
}: {
  initialLikedTrackIds: number[];
}) {
  const [activeWindow, setActiveWindow] = useState<RecWindow>("week");
  const [data, setData] = useState<Recommendations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { likedTrackIds, toggleLike } = useLikeToggle(initialLikedTrackIds);

  const load = useCallback(async (target: RecWindow, refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/recommendations?window=${target}${refresh ? "&refresh=1" : ""}`,
      );
      if (!response.ok) throw new Error("recommendations_failed");
      setData((await response.json()) as Recommendations);
    } catch {
      setError("Impossible de charger les suggestions. Réessayez.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeWindow);
  }, [activeWindow, load]);

  const isEmpty =
    !isLoading &&
    !error &&
    data !== null &&
    data.tracks.length === 0 &&
    data.albums.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            À découvrir
          </h1>
          {data && !isLoading && (
            <p className="mt-1 max-w-2xl text-sm text-white/50">
              {caption(data)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => load(activeWindow, true)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-white/70 transition hover:bg-surface-elevated hover:text-white disabled:opacity-50"
        >
          <RefreshIcon
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Actualiser
        </button>
      </div>

      <div className="flex gap-2">
        {WINDOWS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setActiveWindow(option.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeWindow === option.id
                ? "bg-brand text-white"
                : "bg-surface text-white/60 hover:bg-surface-elevated hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {isLoading && (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-white">
              Titres à découvrir
            </h2>
            <GridSkeleton />
          </section>
        </div>
      )}

      {isEmpty && (
        <p className="text-sm text-white/50">
          Aucune suggestion pour l'instant. Écoutez quelques titres et vos
          recommandations apparaîtront ici.
        </p>
      )}

      {!isLoading && !error && data && (
        <div className="flex flex-col gap-10">
          {data.tracks.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white">
                Titres à découvrir
              </h2>
              <TrackList
                tracks={data.tracks}
                likedTrackIds={likedTrackIds}
                onToggleLike={toggleLike}
              />
            </section>
          )}

          {data.albums.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-white">
                Albums à découvrir
              </h2>
              <AlbumGrid albums={data.albums} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
