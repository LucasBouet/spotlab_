"use client";

import { useEffect, useMemo, useRef } from "react";
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

export function LyricsView({
  state,
  currentTime,
  onSeek,
}: {
  state: LyricsState;
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const lines = state.status === "synced" ? state.lines : null;
  const activeIndex = useMemo(
    () => (lines ? findActiveIndex(lines, currentTime) : -1),
    [lines, currentTime],
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
    <div className="min-h-0 flex-1 overflow-y-auto px-6 text-center">
      <div className="flex flex-col gap-4 py-[35vh]">
        {state.lines.map((line, index) => (
          <button
            key={`${line.time}-${index}`}
            type="button"
            ref={index === activeIndex ? activeRef : undefined}
            onClick={() => onSeek(line.time)}
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
  );
}
