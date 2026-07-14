"use server";

import {
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import {
  clearChallenge,
  deserializeTransports,
  getRelyingParty,
  readChallenge,
  serializeTransports,
  setChallenge,
} from "@/lib/webauthn";

export type StartRegistrationResult =
  | { options: PublicKeyCredentialCreationOptionsJSON }
  | { error: string };

export type PasskeyActionResult = { ok: true } | { error: string };

export async function startPasskeyRegistration(): Promise<StartRegistrationResult> {
  const user = await requireUser();
  const { rpID, rpName } = await getRelyingParty();

  const existing = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((cred) => ({
      id: cred.credentialId,
      transports: deserializeTransports(cred.transports),
    })),
    // No `authenticatorAttachment` so roaming providers (Bitwarden) are allowed
    // alongside platform authenticators. A required resident key makes the
    // credential discoverable, which is what lets the login page work without
    // the user first typing their email.
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  await setChallenge(options.challenge);
  return { options };
}

export async function finishPasskeyRegistration(
  response: RegistrationResponseJSON,
  label: string,
): Promise<PasskeyActionResult> {
  const user = await requireUser();
  const { rpID, origin } = await getRelyingParty();

  const expectedChallenge = await readChallenge();
  await clearChallenge();
  if (!expectedChallenge) {
    return { error: "La demande a expiré. Merci de réessayer." };
  }

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch {
    return { error: "La passkey n'a pas pu être vérifiée." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { error: "La passkey n'a pas pu être vérifiée." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  try {
    await prisma.passkey.create({
      data: {
        userId: user.id,
        credentialId: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: serializeTransports(credential.transports),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        name: label.trim() || "Passkey",
      },
    });
  } catch {
    // Unique constraint on credentialId → this passkey is already registered.
    return { error: "Cette passkey est déjà enregistrée." };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function deletePasskey(id: string): Promise<PasskeyActionResult> {
  const user = await requireUser();

  await prisma.passkey.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/settings");
  return { ok: true };
}
