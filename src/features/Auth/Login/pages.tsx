"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { KeyIcon } from "@/components/icons";
import { type AuthState, signIn } from "@/features/Auth/actions";
import {
  finishPasskeyLogin,
  startPasskeyLogin,
} from "@/features/Auth/passkey-actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(true);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);

  async function handlePasskeyLogin() {
    setPasskeyError(null);
    setPasskeyBusy(true);
    try {
      const start = await startPasskeyLogin();
      if ("error" in start) {
        setPasskeyError(start.error);
        return;
      }

      let response: Awaited<ReturnType<typeof startAuthentication>>;
      try {
        response = await startAuthentication({ optionsJSON: start.options });
      } catch {
        setPasskeyError("Connexion annulée.");
        return;
      }

      const finish = await finishPasskeyLogin(response);
      if ("error" in finish) {
        setPasskeyError(finish.error);
        return;
      }

      // The action set the session cookie; a full navigation lets the proxy
      // pick it up and route us into the app.
      window.location.href = "/";
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white shadow-lg shadow-brand/30">
            S
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Spotlab
          </h1>
          <p className="text-sm text-white/50">Connectez-vous pour continuer</p>
        </div>

        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium text-white/70"
            >
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
            <label
              htmlFor="password"
              className="text-xs font-medium text-white/70"
            >
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

          {passkeySupported && (
            <>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-white/40">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyBusy}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm font-semibold text-white transition hover:border-brand/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyIcon className="h-4 w-4" />
                {passkeyBusy ? "Connexion..." : "Se connecter avec une passkey"}
              </button>

              {passkeyError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {passkeyError}
                </p>
              )}
            </>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium text-brand hover:text-brand-hover"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
