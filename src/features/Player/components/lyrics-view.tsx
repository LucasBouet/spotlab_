"use client";

import { useEffect, useMemo, useRef } from "react";
import { RefreshIcon } from "@/components/icons";
import type { LyricsState } from "@/features/Player/use-lyrics";

function findActiveIndex(
  lines: { time: number; text: string }[],
  currentTime: number,
): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time > currentTime) break;
    active = i;
  }
  return active;
}

function formatOffset(offset: number): string {
  const rounded = Math.round(offset * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}s`;
}

export function LyricsView({
  state,
  currentTime,
  offset,
  onNudge,
  onReset,
  onResync,
  onSeek,
}: {
  state: LyricsState;
  currentTime: number;
  offset: number;
  onNudge: (direction: number) => void;
  onReset: () => void;
  onResync: () => void;
  onSeek: (time: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const lines = state.status === "synced" ? state.lines : null;
  // The offset shifts the whole highlight relative to the audio: a positive
  // offset makes each line wait longer (lyrics were ahead), so we compare line
  // times against an earlier effective moment.
  const activeIndex = useMemo(
    () => (lines ? findActiveIndex(lines, currentTime - offset) : -1),
    [lines, currentTime, offset],
  );

  useEffect(() => {
    if (activeIndex === -1) return;
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex]);

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-white/40">
        {state.status === "loading" ? "Chargement des paroles…" : ""}
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/40">
        Paroles indisponibles pour ce titre.
      </div>
    );
  }

  if (state.status === "plain") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <p className="whitespace-pre-line text-center text-lg leading-relaxed text-white/70">
          {state.text}
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto px-6 text-center">
        <div className="flex flex-col gap-4 py-[35vh]">
          {state.lines.map((line, index) => (
            <button
              key={`${line.time}-${index}`}
              type="button"
              ref={index === activeIndex ? activeRef : undefined}
              // Click-to-seek targets the audio moment where this line is
              // actually highlighted, i.e. its LRC time plus the current offset.
              onClick={() => onSeek(line.time + offset)}
              className={`w-full text-center text-xl font-semibold leading-snug transition-all duration-300 sm:text-2xl ${
                index === activeIndex
                  ? "scale-105 text-white"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {line.text || "♪"}
            </button>
          ))}
        </div>
      </div>

      <LyricsSyncControls
        offset={offset}
        onNudge={onNudge}
        onReset={onReset}
        onResync={onResync}
      />
    </div>
  );
}

function LyricsSyncControls({
  offset,
  onNudge,
  onReset,
  onResync,
}: {
  offset: number;
  onNudge: (direction: number) => void;
  onReset: () => void;
  onResync: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-surface-elevated/90 p-1 text-white shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => onNudge(-1)}
          aria-label="Avancer les paroles"
          className="flex h-8 w-9 items-center justify-center rounded-full text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          −
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={offset === 0}
          aria-label="Réinitialiser le décalage des paroles"
          title="Réinitialiser le décalage"
          className="min-w-[3.5rem] rounded-full px-2 text-center text-xs tabular-nums text-white/60 transition enabled:hover:text-white disabled:cursor-default"
        >
          {formatOffset(offset)}
        </button>
        <button
          type="button"
          onClick={() => onNudge(1)}
          aria-label="Retarder les paroles"
          className="flex h-8 w-9 items-center justify-center rounded-full text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          +
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={onResync}
          aria-label="Resynchroniser les paroles"
          title="Resynchroniser"
          className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover"
        >
          <RefreshIcon className="h-3.5 w-3.5" />
          Resync
        </button>
      </div>
    </div>
  );
}
