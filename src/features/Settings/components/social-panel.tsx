"use client";

import Image from "next/image";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { CheckIcon, PlusIcon, TrashIcon, XIcon } from "@/components/icons";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  type SocialActionState,
  sendFriendRequest,
} from "@/features/Settings/social-actions";
import type {
  FriendActivity,
  FriendActivityUpdate,
  SocialData,
} from "@/lib/social-types";

const initialState: SocialActionState = { error: null, success: null };
const POLL_INTERVAL_MS = 5000;

function displayName(name: string | null, email: string): string {
  return name?.trim() ? name : email;
}

export function SocialPanel({ initialData }: { initialData: SocialData }) {
  const { friends, incoming, outgoing } = initialData;

  // Live presence keyed by friend user id, refreshed by polling. Overrides the
  // snapshot embedded in `initialData` (which is only as fresh as the last page
  // render). Cleared entries simply fall back to the snapshot.
  const [liveActivity, setLiveActivity] = useState<
    Record<string, FriendActivity>
  >({});

  useEffect(() => {
    if (friends.length === 0) return;
    let cancelled = false;

    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/friends/activity");
        if (!res.ok) return;
        const data = (await res.json()) as {
          activities: FriendActivityUpdate[];
        };
        if (cancelled) return;
        const next: Record<string, FriendActivity> = {};
        for (const item of data.activities) next[item.userId] = item.activity;
        setLiveActivity(next);
      } catch {
        // Transient network blip — the next tick will retry.
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // Re-subscribe when the set of friends changes (add/remove), so a freshly
    // added friend starts getting polled without a manual refresh.
  }, [friends.length]);

  return (
    <div className="flex flex-col gap-6">
      <AddFriendForm />

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-white">
            Demandes reçues
            <span className="ml-2 text-xs font-normal text-white/50">
              {incoming.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((req) => (
              <IncomingRequestRow
                key={req.id}
                id={req.id}
                label={displayName(req.name, req.email)}
                sub={req.name ? req.email : null}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-white">
          Amis
          <span className="ml-2 text-xs font-normal text-white/50">
            {friends.length}
          </span>
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-white/50">
            Vous n'avez pas encore d'amis. Ajoutez-en un par e-mail ci-dessus.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {friends.map((friend) => (
              <FriendRow
                key={friend.friendshipId}
                friendshipId={friend.friendshipId}
                label={displayName(friend.name, friend.email)}
                activity={liveActivity[friend.userId] ?? friend.activity}
              />
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-white">
            Demandes envoyées
            <span className="ml-2 text-xs font-normal text-white/50">
              {outgoing.length}
            </span>
          </h2>
          <ul className="flex flex-col gap-2">
            {outgoing.map((req) => (
              <OutgoingRequestRow
                key={req.id}
                id={req.id}
                label={displayName(req.name, req.email)}
                sub={req.name ? req.email : null}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AddFriendForm() {
  const [state, formAction, isPending] = useActionState(
    sendFriendRequest,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the field once a request actually went out.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-white">Ajouter un ami</h2>
        <p className="mt-1 text-xs text-white/50">
          Envoyez une demande d'ami à l'aide de son adresse e-mail.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder="ami@exemple.com"
          autoComplete="off"
          className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          {isPending ? "Envoi..." : "Envoyer"}
        </button>
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {state.success}
        </p>
      )}
    </form>
  );
}

function IncomingRequestRow({
  id,
  label,
  sub,
}: {
  id: string;
  label: string;
  sub: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  const run = (action: (id: string) => Promise<SocialActionState>) => {
    startTransition(async () => {
      await action(id);
    });
  };

  return (
    <li className="flex items-center gap-3 rounded-lg bg-surface-elevated px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{label}</p>
        {sub && <p className="truncate text-xs text-white/50">{sub}</p>}
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(acceptFriendRequest)}
        aria-label="Accepter"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        <CheckIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(declineFriendRequest)}
        aria-label="Refuser"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-white/60 transition hover:text-white disabled:opacity-50"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

function OutgoingRequestRow({
  id,
  label,
  sub,
}: {
  id: string;
  label: string;
  sub: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-lg bg-surface-elevated px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{label}</p>
        {sub && <p className="truncate text-xs text-white/50">{sub}</p>}
      </div>
      <span className="shrink-0 text-xs text-white/40">En attente</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await cancelFriendRequest(id);
          })
        }
        className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-white/60 transition hover:text-white disabled:opacity-50"
      >
        Annuler
      </button>
    </li>
  );
}

function FriendRow({
  friendshipId,
  label,
  activity,
}: {
  friendshipId: string;
  label: string;
  activity: FriendActivity;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-surface-elevated">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          activity.online ? "bg-emerald-400" : "bg-white/25"
        }`}
        aria-hidden="true"
      />

      {activity.track?.cover ? (
        <Image
          src={activity.track.cover}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded object-cover"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{label}</p>
        {activity.track ? (
          <p className="truncate text-xs text-white/50">
            {activity.isPlaying ? "Écoute " : "En pause · "}
            <span className="text-white/70">{activity.track.title}</span>
            {" — "}
            {activity.track.artist}
          </p>
        ) : (
          <p className="truncate text-xs text-white/40">
            {activity.online ? "En ligne" : "Hors ligne"}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await removeFriend(friendshipId);
          })
        }
        aria-label="Retirer cet ami"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 opacity-0 transition hover:text-red-400 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}
