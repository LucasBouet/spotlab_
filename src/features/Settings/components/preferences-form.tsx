"use client";

import { useActionState } from "react";
import { USER_SETTINGS, type UserSettingKey } from "@/config/settings";
import {
  type SettingsFormState,
  updateUserPreferences,
} from "@/features/Settings/actions";

const initialState: SettingsFormState = { error: null, success: false };

export function PreferencesForm({
  settings,
}: {
  settings: Record<UserSettingKey, string>;
}) {
  const [state, formAction, isPending] = useActionState(
    updateUserPreferences,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
    >
      <h2 className="text-sm font-semibold text-white">Préférences</h2>

      {USER_SETTINGS.map((definition) => (
        <div key={definition.key} className="flex flex-col gap-1.5">
          <label
            htmlFor={definition.key}
            className="text-xs font-medium text-white/70"
          >
            {definition.label}
          </label>
          <p className="text-xs text-white/50">{definition.description}</p>
          <select
            id={definition.key}
            name={definition.key}
            defaultValue={settings[definition.key]}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            {definition.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Préférences mises à jour.
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
