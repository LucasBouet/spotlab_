"use client";

import { useActionState } from "react";
import { APP_SETTINGS, type AppSettingKey } from "@/config/settings";
import {
  type AdminSettingsState,
  updateAppSettings,
} from "@/features/Admin/actions";
import { AdminTabs } from "@/features/Admin/components/admin-tabs";

const initialState: AdminSettingsState = { error: null, success: false };

export default function AdminSettingsPage({
  settings,
}: {
  settings: Record<AppSettingKey, string>;
}) {
  const [state, formAction, isPending] = useActionState(
    updateAppSettings,
    initialState,
  );

  return (
    <div className="flex flex-1 flex-col">
      <AdminTabs />

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Paramètres de l'application
        </h1>

        <form action={formAction} className="flex flex-col gap-5">
          {APP_SETTINGS.map((definition) => (
            <div key={definition.key} className="flex flex-col gap-1.5">
              <label
                htmlFor={definition.key}
                className="text-sm font-medium text-white"
              >
                {definition.label}
              </label>
              <p className="text-xs text-white/50">{definition.description}</p>

              {definition.type === "boolean" ? (
                <label className="mt-1 flex w-fit items-center gap-2 text-sm text-white/70">
                  <input
                    id={definition.key}
                    name={definition.key}
                    type="checkbox"
                    defaultChecked={settings[definition.key] === "true"}
                    className="h-4 w-4 rounded border-border accent-brand"
                  />
                  Activé
                </label>
              ) : (
                <input
                  id={definition.key}
                  name={definition.key}
                  type="text"
                  defaultValue={settings[definition.key]}
                  className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              )}
            </div>
          ))}

          {state.error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              Paramètres enregistrés.
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
      </div>
    </div>
  );
}
