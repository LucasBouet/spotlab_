"use client";

import Image from "next/image";
import { PlayIcon } from "@/components/icons";
import type { ListeningStats, StatEntry } from "@/features/Settings/stats";

function formatListeningTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes.toString().padStart(2, "0")}`;
}

function RankedList({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: StatEntry[];
  emptyLabel: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-white/80">{title}</h2>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-elevated px-4 py-6 text-center text-sm text-white/40">
          {emptyLabel}
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-elevated">
          {entries.map((entry, index) => (
            <li
              key={`${entry.label}-${entry.sublabel ?? ""}`}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <span className="w-5 shrink-0 text-center text-sm font-semibold text-white/40">
                {index + 1}
              </span>
              {entry.cover ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface">
                  <Image
                    src={entry.cover}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {entry.label}
                </p>
                {entry.sublabel ? (
                  <p className="truncate text-xs text-white/50">
                    {entry.sublabel}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-white/50">
                {entry.count} {entry.count > 1 ? "écoutes" : "écoute"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function StatsPanel({ stats }: { stats: ListeningStats }) {
  if (stats.totalPlays === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-white/40">
          <PlayIcon className="h-5 w-5 translate-x-0.5" />
        </div>
        <p className="text-sm font-medium text-white">
          Aucune écoute pour l'instant
        </p>
        <p className="max-w-xs text-xs text-white/50">
          Écoute un titre pendant au moins 30 secondes et il apparaîtra dans tes
          statistiques.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-elevated px-4 py-4">
          <span className="text-xs text-white/50">Temps d'écoute total</span>
          <span className="text-2xl font-semibold tracking-tight text-white">
            {formatListeningTime(stats.totalSeconds)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-elevated px-4 py-4">
          <span className="text-xs text-white/50">Écoutes</span>
          <span className="text-2xl font-semibold tracking-tight text-white">
            {stats.totalPlays}
          </span>
        </div>
      </div>

      <RankedList
        title="Titres les plus écoutés"
        entries={stats.topTracks}
        emptyLabel="Aucun titre pour l'instant."
      />
      <RankedList
        title="Albums les plus écoutés"
        entries={stats.topAlbums}
        emptyLabel="Aucun album pour l'instant."
      />
      <RankedList
        title="Genres les plus écoutés"
        entries={stats.topGenres}
        emptyLabel="Les genres apparaîtront après quelques écoutes."
      />
    </div>
  );
}
