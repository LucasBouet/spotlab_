"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DownloadIcon } from "@/components/icons";

type ImportProgress = { fetched: number; total: number } | null;
type ImportDestination = "playlist" | "liked";

export function ImportPlaylistForm() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [destination, setDestination] = useState<ImportDestination>("playlist");
  const [name, setName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const trimmed = link.trim();
    if (!trimmed || isImporting) return;

    setIsImporting(true);
    setError(null);
    setProgress(null);

    try {
      const response = await fetch("/api/playlists/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: trimmed,
          destination,
          name: destination === "playlist" ? name.trim() : undefined,
        }),
      });

      if (!response.body) throw new Error("Import impossible.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let redirectTo: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "progress") {
            setProgress({ fetched: event.fetched, total: event.total });
          } else if (event.type === "done") {
            redirectTo = event.redirectTo;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      if (redirectTo) {
        setLink("");
        setName("");
        router.push(redirectTo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setIsImporting(false);
      setProgress(null);
    }
  }

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.fetched / progress.total) * 100))
      : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-sm font-semibold text-white">
          Importer une playlist Deezer
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Collez le lien d'une playlist Deezer pour l'ajouter à votre
          bibliothèque.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="deezer-playlist-link"
          className="text-xs font-medium text-white/70"
        >
          Lien de la playlist
        </label>
        <input
          id="deezer-playlist-link"
          type="url"
          value={link}
          disabled={isImporting}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleImport();
            }
          }}
          placeholder="https://www.deezer.com/fr/playlist/..."
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-white/70">Destination</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isImporting}
            onClick={() => setDestination("playlist")}
            aria-pressed={destination === "playlist"}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              destination === "playlist"
                ? "border-brand bg-brand/10 text-white"
                : "border-border bg-surface-elevated text-white/60 hover:text-white"
            }`}
          >
            Nouvelle playlist
          </button>
          <button
            type="button"
            disabled={isImporting}
            onClick={() => setDestination("liked")}
            aria-pressed={destination === "liked"}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              destination === "liked"
                ? "border-brand bg-brand/10 text-white"
                : "border-border bg-surface-elevated text-white/60 hover:text-white"
            }`}
          >
            Titres likés
          </button>
        </div>
      </div>

      {destination === "playlist" && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="deezer-playlist-name"
            className="text-xs font-medium text-white/70"
          >
            Nom de la playlist
          </label>
          <input
            id="deezer-playlist-name"
            type="text"
            value={name}
            disabled={isImporting}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleImport();
              }
            }}
            placeholder="Nom d'origine de la playlist par défaut"
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          />
        </div>
      )}

      {isImporting && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
            {percent === null ? (
              <div className="h-full w-1/3 rounded-full bg-brand animate-progress-indeterminate" />
            ) : (
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            )}
          </div>
          <p className="text-xs text-white/50">
            {progress
              ? `Importation en cours... ${progress.fetched} / ${progress.total} titres`
              : "Récupération de la playlist..."}
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={!link.trim() || isImporting}
        className="flex w-fit items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <DownloadIcon className="h-4 w-4" />
        {isImporting ? "Importation..." : "Importer"}
      </button>
    </div>
  );
}
