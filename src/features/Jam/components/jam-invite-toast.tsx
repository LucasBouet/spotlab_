"use client";

import { useState } from "react";
import { CheckIcon, JamIcon, XIcon } from "@/components/icons";
import { usePlayer } from "@/features/Player/player-context";

// A lightweight, always-mounted notification for incoming jam invites — the one
// piece of jam UI that lives outside the Réglages > Social tab, because an
// invite has to reach a friend wherever they are in the app, not only when they
// happen to have the settings page open. Accepting/declining, and all other jam
// controls, otherwise live in the Social tab.
export function JamInviteToast() {
  const { jamInvites, acceptJamInvite, declineJamInvite } = usePlayer();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (jamInvites.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-28 z-[60] flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 sm:bottom-32">
      {jamInvites.map((invite) => {
        const isBusy = busyId === invite.jamId;
        return (
          <div
            key={invite.jamId}
            className="flex flex-col gap-3 rounded-2xl border border-brand/40 bg-surface-elevated p-4 shadow-xl shadow-black/40"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">
                <JamIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  Invitation à une jam
                </p>
                <p className="truncate text-xs text-white/60">
                  <span className="text-white/80">{invite.hostName}</span> vous
                  invite à écouter ensemble
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setBusyId(invite.jamId);
                  try {
                    await acceptJamInvite(invite.jamId);
                  } finally {
                    setBusyId(null);
                  }
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
              >
                <CheckIcon className="h-4 w-4" />
                Rejoindre
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setBusyId(invite.jamId);
                  declineJamInvite(invite.jamId);
                }}
                aria-label="Refuser"
                className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-white/60 transition hover:text-white disabled:opacity-60"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
