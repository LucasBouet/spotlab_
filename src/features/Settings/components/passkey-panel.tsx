"use client";

import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { KeyIcon, PlusIcon, TrashIcon } from "@/components/icons";
import {
  deletePasskey,
  finishPasskeyRegistration,
  startPasskeyRegistration,
} from "@/features/Settings/passkey-actions";

export type PasskeyInfo = {
  id: string;
  name: string;
  createdAt: string;
};

export function PasskeyPanel({ passkeys }: { passkeys: PasskeyInfo[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
  }, []);

  async function handleAdd() {
    setError(null);
    setBusy(true);
    try {
      const start = await startPasskeyRegistration();
      if ("error" in start) {
        setError(start.error);
        return;
      }

      let response: Awaited<ReturnType<typeof startRegistration>>;
      try {
        response = await startRegistration({ optionsJSON: start.options });
      } catch (err) {
        // The authenticator rejects registering the same credential twice.
        if (err instanceof Error && err.name === "InvalidStateError") {
          setError("Cette passkey est déjà enregistrée sur cet appareil.");
        } else {
          setError("Enregistrement annulé.");
        }
        return;
      }

      const finish = await finishPasskeyRegistration(response, name);
      if ("error" in finish) {
        setError(finish.error);
        return;
      }

      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <KeyIcon className="h-4 w-4 text-brand" />
          Passkeys
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Connectez-vous sans mot de passe avec Face/Touch ID, Windows Hello ou
          un gestionnaire comme Bitwarden.
        </p>
      </div>

      {passkeys.length > 0 && (
        <ul className="flex flex-col gap-2">
          {passkeys.map((passkey) => (
            <PasskeyRow
              key={passkey.id}
              id={passkey.id}
              name={passkey.name}
              createdAt={passkey.createdAt}
              onDeleted={() => router.refresh()}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          type="text"
          maxLength={60}
          placeholder="Nom (optionnel) — ex. Bitwarden"
          className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || !supported}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusIcon className="h-4 w-4" />
          {busy ? "Enregistrement..." : "Ajouter une passkey"}
        </button>
      </div>

      {!supported && (
        <p className="text-xs text-white/50">
          Votre navigateur ne prend pas en charge les passkeys.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

function PasskeyRow({
  id,
  name,
  createdAt,
  onDeleted,
}: {
  id: string;
  name: string;
  createdAt: string;
  onDeleted: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const formattedDate = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <li className="flex items-center gap-3 rounded-lg bg-surface-elevated px-3 py-2">
      <KeyIcon className="h-4 w-4 shrink-0 text-white/40" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white">{name}</p>
        <p className="truncate text-xs text-white/50">
          Ajoutée le {formattedDate}
        </p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deletePasskey(id);
            onDeleted();
          })
        }
        aria-label="Supprimer cette passkey"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition hover:text-red-400 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}
