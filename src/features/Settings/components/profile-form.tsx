"use client";

import { useActionState } from "react";
import {
  type SettingsFormState,
  updateProfile,
} from "@/features/Settings/actions";

const initialState: SettingsFormState = { error: null, success: false };

export function ProfileForm({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
    >
      <h2 className="text-sm font-semibold text-white">Profil</h2>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-medium text-white/70">
          Nom
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={name ?? ""}
          autoComplete="name"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-white/70">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={email}
          autoComplete="email"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Profil mis à jour.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
