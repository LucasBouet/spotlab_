"use client";

import { useEffect, useRef, useState } from "react";
import { DotsIcon } from "@/components/icons";
import { type PlayerTrack, usePlayer } from "@/features/Player/player-context";

export function TrackQueueMenu({ track }: { track: PlayerTrack }) {
  const { queuePlayNext, queueAddToEnd } = usePlayer();
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Plus d'options"
        className="text-white/40 transition hover:text-white"
      >
        <DotsIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-30 mt-2 w-56 rounded-lg border border-border bg-surface-elevated p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              queuePlayNext(track);
              setIsOpen(false);
            }}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-white transition hover:bg-surface"
          >
            Lire ensuite
          </button>
          <button
            type="button"
            onClick={() => {
              queueAddToEnd(track);
              setIsOpen(false);
            }}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-white transition hover:bg-surface"
          >
            Ajouter à la file d'attente
          </button>
        </div>
      )}
    </div>
  );
}
