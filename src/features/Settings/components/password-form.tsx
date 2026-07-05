"use client";

import { useActionState } from "react";
import {
  type SettingsFormState,
  updatePassword,
} from "@/features/Settings/actions";

const initialState: SettingsFormState = { error: null, success: false };

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
    >
      <h2 className="text-sm font-semibold text-white">Mot de passe</h2>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="currentPassword"
          className="text-xs font-medium text-white/70"
        >
          Mot de passe actuel
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="newPassword"
          className="text-xs font-medium text-white/70"
        >
          Nouveau mot de passe
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmNewPassword"
          className="text-xs font-medium text-white/70"
        >
          Confirmer le nouveau mot de passe
        </label>
        <input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
          Mot de passe mis à jour.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Enregistrement..." : "Changer le mot de passe"}
      </button>
    </form>
  );
}
