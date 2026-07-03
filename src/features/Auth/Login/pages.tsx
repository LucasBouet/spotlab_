"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AuthState, signIn } from "@/features/Auth/actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white shadow-lg shadow-brand/30">
            S
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Spotlab</h1>
          <p className="text-sm text-white/50">Connectez-vous pour continuer</p>
        </div>

        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-white/70">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-white/70">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {state.error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-brand hover:text-brand-hover">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
