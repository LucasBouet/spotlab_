"use client";

import { useEffect, useRef, useState } from "react";
import { DevicesIcon, TrashIcon, XIcon } from "@/components/icons";
import { usePlayer } from "@/features/Player/player-context";
import type { DeviceDTO } from "@/lib/sync-types";

function formatLastSeen(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function DeviceRow({
  device,
  isSelf,
  isActiveOutput,
  canToggleOutput,
  onToggleOutput,
}: {
  device: DeviceDTO;
  isSelf: boolean;
  isActiveOutput: boolean;
  canToggleOutput: boolean;
  onToggleOutput: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(device.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  async function commitRename() {
    setIsEditing(false);
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === device.name) {
      setDraftName(device.name);
      return;
    }
    // The server broadcasts the updated device list to every connected
    // panel (including this one) over SSE, so no local optimistic state is
    // needed here.
    try {
      await fetch(`/api/devices/${device.deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      setDraftName(device.name);
    }
  }

  async function handleForget() {
    try {
      await fetch(`/api/devices/${device.deviceId}`, { method: "DELETE" });
    } catch {
      // La liste sera corrigée au prochain rafraîchissement.
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-surface-elevated">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${device.online ? "bg-green-500" : "bg-white/20"}`}
      />
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraftName(device.name);
                setIsEditing(false);
              }
            }}
            className="w-full rounded bg-transparent text-sm font-medium text-white outline-none ring-1 ring-brand"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="block max-w-full truncate text-left text-sm font-medium text-white hover:underline"
          >
            {device.name}
            {isSelf && (
              <span className="ml-1.5 text-xs font-normal text-white/40">
                (cet appareil)
              </span>
            )}
          </button>
        )}
        <p className="truncate text-xs text-white/40">
          {device.platform}
          {!device.online && ` · Vu ${formatLastSeen(device.lastSeenAt)}`}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggleOutput}
        disabled={!canToggleOutput}
        aria-pressed={isActiveOutput}
        aria-label="Diffuser sur cet appareil"
        title="Diffuser ici"
        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition disabled:opacity-30 ${
          isActiveOutput
            ? "bg-brand/20 text-brand"
            : "text-white/40 hover:text-white"
        }`}
      >
        <DevicesIcon className="h-3.5 w-3.5" />
      </button>
      {!isSelf && (
        <button
          type="button"
          onClick={handleForget}
          aria-label="Oublier cet appareil"
          className="shrink-0 text-white/30 transition hover:text-red-400"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export function DevicesPanel() {
  const {
    isDevicesOpen,
    closeDevicesPanel,
    deviceId,
    devices,
    activeDeviceIds,
    setActiveDevices,
    currentTrack,
  } = usePlayer();

  function toggleOutput(targetDeviceId: string) {
    const next = activeDeviceIds.includes(targetDeviceId)
      ? activeDeviceIds.filter((id) => id !== targetDeviceId)
      : [...activeDeviceIds, targetDeviceId];
    setActiveDevices(next);
  }

  return (
    <>
      {isDevicesOpen && (
        <button
          type="button"
          aria-label="Fermer les appareils"
          onClick={closeDevicesPanel}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <div
        className={
          isDevicesOpen
            ? "fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] translate-x-0 flex-col border-l border-border bg-surface transition-transform duration-300 md:relative md:z-auto md:translate-x-0"
            : "fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] translate-x-full flex-col border-l border-border bg-surface transition-transform duration-300 md:relative md:z-auto md:w-0 md:translate-x-0 md:overflow-hidden md:border-l-0"
        }
      >
        <div className="flex w-80 shrink-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-semibold text-white">Appareils</h2>
            <button
              type="button"
              onClick={closeDevicesPanel}
              aria-label="Fermer"
              className="text-white/60 transition hover:text-white"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {devices.length === 0 ? (
              <p className="p-2 text-sm text-white/40">Aucun appareil connu.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {devices.map((device) => (
                  <DeviceRow
                    key={device.deviceId}
                    device={device}
                    isSelf={device.deviceId === deviceId}
                    isActiveOutput={activeDeviceIds.includes(device.deviceId)}
                    canToggleOutput={!!currentTrack}
                    onToggleOutput={() => toggleOutput(device.deviceId)}
                  />
                ))}
              </ul>
            )}
          </div>

          <p className="border-t border-border p-3 text-center text-xs text-white/30">
            La lecture simultanée sur plusieurs appareils n'est pas parfaitement
            synchronisée (léger décalage possible).
          </p>
        </div>
      </div>
    </>
  );
}
