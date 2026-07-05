"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HeartIcon, SearchIcon } from "@/components/icons";
import { likeTrack, unlikeTrack } from "@/features/Library/actions";

type SearchType = "track" | "album" | "artist";

type DeezerTrack = {
  id: number;
  title: string;
  duration: number;
  artist: { name: string };
  album: { title: string; cover_medium: string };
};

type DeezerAlbum = {
  id: number;
  title: string;
  cover_medium: string;
  record_type: string;
  artist: { name: string };
};

type DeezerArtist = {
  id: number;
  name: string;
  picture_medium: string;
  nb_fan: number;
};

const TABS: { type: SearchType; label: string }[] = [
  { type: "track", label: "Musique" },
  { type: "album", label: "Albums" },
  { type: "artist", label: "Artistes" },
];

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCount(count: number) {
  return new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(count);
}

export default function SearchPage({ initialLikedTrackIds }: { initialLikedTrackIds: number[] }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchType>("track");
  const [results, setResults] = useState<(DeezerTrack | DeezerAlbum | DeezerArtist)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedTrackIds, setLikedTrackIds] = useState(() => new Set(initialLikedTrackIds));

  useEffect(() => {
    setResults([]);

    const trimmed = query.trim();
    if (!trimmed) {
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?type=${activeTab}&q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search_failed");
        const payload = await response.json();
        setResults(payload.data ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("La recherche a échoué. Réessayez.");
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, activeTab]);

  async function toggleLike(track: DeezerTrack) {
    const isLiked = likedTrackIds.has(track.id);

    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(track.id);
      } else {
        next.add(track.id);
      }
      return next;
    });

    try {
      if (isLiked) {
        await unlikeTrack(track.id);
      } else {
        await likeTrack({
          deezerTrackId: track.id,
          title: track.title,
          artistName: track.artist.name,
          albumTitle: track.album.title,
          albumCover: track.album.cover_medium,
          duration: track.duration,
        });
      }
    } catch {
      setLikedTrackIds((prev) => {
        const next = new Set(prev);
        if (isLiked) {
          next.add(track.id);
        } else {
          next.delete(track.id);
        }
        return next;
      });
    }
  }

  const hasQuery = query.trim().length > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Titres, albums, artistes..."
          className="w-full rounded-full border border-border bg-surface py-3 pr-4 pl-11 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActiveTab(tab.type)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.type
                ? "bg-brand text-white"
                : "bg-surface text-white/60 hover:bg-surface-elevated hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {isLoading && <p className="text-sm text-white/40">Recherche en cours...</p>}

      {!isLoading && !error && hasQuery && results.length === 0 && (
        <p className="text-sm text-white/40">Aucun résultat pour « {query} ».</p>
      )}

      {!hasQuery && (
        <p className="text-sm text-white/40">
          Commencez à taper pour rechercher un titre, un album ou un artiste sur Deezer.
        </p>
      )}

      {activeTab === "track" && (
        <ul className="flex flex-col divide-y divide-border">
          {(results as DeezerTrack[]).map((track) => {
            const isLiked = likedTrackIds.has(track.id);
            return (
              <li key={track.id} className="flex items-center gap-3 py-2.5">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
                  <Image
                    src={track.album.cover_medium}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{track.title}</p>
                  <p className="truncate text-xs text-white/50">{track.artist.name}</p>
                </div>
                <span className="shrink-0 text-xs text-white/40">{formatDuration(track.duration)}</span>
                <button
                  type="button"
                  onClick={() => toggleLike(track)}
                  aria-label={isLiked ? "Retirer des titres likés" : "Ajouter aux titres likés"}
                  className={`shrink-0 transition hover:text-brand ${isLiked ? "text-brand" : "text-white/40"}`}
                >
                  <HeartIcon className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {activeTab === "album" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(results as DeezerAlbum[]).map((album) => (
            <div
              key={album.id}
              className="flex flex-col gap-2 rounded-lg p-2 transition hover:bg-surface-elevated"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md">
                <Image
                  src={album.cover_medium}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{album.title}</p>
                <p className="truncate text-xs text-white/50">{album.artist.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "artist" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(results as DeezerArtist[]).map((artist) => (
            <div
              key={artist.id}
              className="flex flex-col items-center gap-2 rounded-lg p-3 text-center transition hover:bg-surface-elevated"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-full">
                <Image
                  src={artist.picture_medium}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{artist.name}</p>
                {typeof artist.nb_fan === "number" && (
                  <p className="text-xs text-white/50">{formatCount(artist.nb_fan)} fans</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
