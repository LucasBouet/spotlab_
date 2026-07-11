"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import type { CSSProperties } from "react";
import { GripIcon, ShuffleIcon, XIcon } from "@/components/icons";
import { type QueueItem, usePlayer } from "@/features/Player/player-context";
import { useResizableWidth } from "@/lib/use-resizable-width";

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 260;
const MAX_WIDTH = 480;

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function QueueRow({ item }: { item: QueueItem }) {
  const { playFromQueue, removeFromQueue } = usePlayer();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 ${
        isDragging
          ? "z-10 bg-surface-elevated opacity-70"
          : "hover:bg-surface-elevated"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Réordonner"
        className="shrink-0 touch-none text-white/30 hover:text-white/60"
      >
        <GripIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => playFromQueue(item.uid)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
          {item.cover && (
            <Image
              src={item.cover}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white">{item.title}</p>
          <p className="truncate text-xs text-white/50">{item.artist}</p>
        </div>
      </button>
      <span className="shrink-0 text-xs text-white/40">
        {formatDuration(item.duration)}
      </span>
      <button
        type="button"
        onClick={() => removeFromQueue(item.uid)}
        aria-label="Retirer de la file d'attente"
        className="shrink-0 text-white/30 transition hover:text-red-400"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

export function QueuePanel() {
  const {
    isQueueOpen,
    closeQueuePanel,
    queue,
    reorderQueue,
    currentTrack: current,
    shuffle,
    toggleShuffle,
  } = usePlayer();

  const { width, handlePointerDown } = useResizableWidth({
    storageKey: "spotlab:queue-width",
    defaultWidth: DEFAULT_WIDTH,
    min: MIN_WIDTH,
    max: MAX_WIDTH,
    handleSide: "left",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = queue.findIndex((item) => item.uid === active.id);
    const toIndex = queue.findIndex((item) => item.uid === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    reorderQueue(fromIndex, toIndex);
  }

  return (
    <>
      {isQueueOpen && (
        <button
          type="button"
          aria-label="Fermer la file d'attente"
          onClick={closeQueuePanel}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <div
        style={{ "--queue-w": `${width}px` } as CSSProperties}
        className={
          isQueueOpen
            ? "fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] translate-x-0 flex-col border-l border-border bg-surface transition-transform duration-300 md:relative md:z-auto md:w-(--queue-w) md:max-w-none md:translate-x-0 md:transition-[width]"
            : "fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] translate-x-full flex-col border-l border-border bg-surface transition-transform duration-300 md:relative md:z-auto md:w-0 md:max-w-none md:translate-x-0 md:overflow-hidden md:border-l-0 md:transition-[width]"
        }
      >
        {isQueueOpen && (
          <button
            type="button"
            onPointerDown={handlePointerDown}
            aria-label="Redimensionner la file d'attente"
            className="absolute inset-y-0 -left-0.5 z-10 hidden w-1.5 cursor-col-resize touch-none hover:bg-brand/40 active:bg-brand/60 md:block"
          />
        )}
        <div className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden md:w-(--queue-w)">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-semibold text-white">File d'attente</h2>
            <button
              type="button"
              onClick={closeQueuePanel}
              aria-label="Fermer"
              className="text-white/60 transition hover:text-white"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {current && (
            <div className="border-b border-border p-4">
              <p className="mb-2 text-xs font-medium text-white/50">
                En cours de lecture
              </p>
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
                  {current.cover && (
                    <Image
                      src={current.cover}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {current.title}
                  </p>
                  <p className="truncate text-xs text-white/50">
                    {current.artist}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <p className="text-xs font-medium text-white/50">
              Prochains titres
            </p>
            <button
              type="button"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              aria-label="Lecture aléatoire"
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition ${
                shuffle
                  ? "bg-brand/20 text-brand"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <ShuffleIcon className="h-4 w-4" />
              {shuffle && "Aléatoire"}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {queue.length === 0 ? (
              <p className="p-2 text-sm text-white/40">Aucun titre à venir.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={queue.map((item) => item.uid)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-0.5">
                    {queue.map((item) => (
                      <QueueRow key={item.uid} item={item} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
