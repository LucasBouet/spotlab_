import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { cookies, headers } from "next/headers";

// WebAuthn needs a Relying Party ID (the bare domain) and an expected origin.
// In production Spotlab sits behind a reverse proxy (spotlab.ugnbt.com), so we
// read the public host/scheme from the forwarded headers — the same ones
// `session.ts` already trusts. `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` can override
// them if the proxy ever stops forwarding those headers. Deriving from headers
// also means it "just works" on http://localhost during development.
export const WEBAUTHN_RP_NAME = "Spotlab";

const CHALLENGE_COOKIE = "spotlab_wa_challenge";
const CHALLENGE_TTL_SECONDS = 300; // 5 min — plenty for the browser prompt.

export async function getRelyingParty() {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  const rpID = process.env.WEBAUTHN_RP_ID ?? host.split(":")[0];
  const origin = process.env.WEBAUTHN_ORIGIN ?? `${proto}://${host}`;

  return { rpID, rpName: WEBAUTHN_RP_NAME, origin };
}

// The challenge issued by the "start" step must survive until the "finish"
// step, which is a separate request. A short-lived httpOnly cookie keeps the
// flow stateless (no extra DB table) and works before a session exists (login).
export async function setChallenge(challenge: string) {
  const headerList = await headers();
  const isHttps = headerList.get("x-forwarded-proto") === "https";

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: CHALLENGE_TTL_SECONDS,
    path: "/",
  });
}

export async function readChallenge(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CHALLENGE_COOKIE)?.value ?? null;
}

export async function clearChallenge() {
  const cookieStore = await cookies();
  cookieStore.delete(CHALLENGE_COOKIE);
}

// Transports are stored as a comma-separated string in SQLite.
export function serializeTransports(
  transports: AuthenticatorTransportFuture[] | undefined,
): string | null {
  return transports && transports.length > 0 ? transports.join(",") : null;
}

export function deserializeTransports(
  value: string | null,
): AuthenticatorTransportFuture[] | undefined {
  if (!value) return undefined;
  const parsed = value.split(",").filter(Boolean);
  return parsed.length > 0
    ? (parsed as AuthenticatorTransportFuture[])
    : undefined;
}
