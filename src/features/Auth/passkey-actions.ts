"use server";

import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  type PublicKeyCredentialRequestOptionsJSON,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import {
  clearChallenge,
  deserializeTransports,
  getRelyingParty,
  readChallenge,
  setChallenge,
} from "@/lib/webauthn";

export type StartLoginResult =
  | { options: PublicKeyCredentialRequestOptionsJSON }
  | { error: string };

export type FinishLoginResult = { ok: true } | { error: string };

export async function startPasskeyLogin(): Promise<StartLoginResult> {
  const { rpID } = await getRelyingParty();

  // Empty `allowCredentials` = usernameless / discoverable flow: the
  // authenticator (Bitwarden, OS keychain, …) shows its own account picker.
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: [],
  });

  await setChallenge(options.challenge);
  return { options };
}

export async function finishPasskeyLogin(
  response: AuthenticationResponseJSON,
): Promise<FinishLoginResult> {
  const { rpID, origin } = await getRelyingParty();

  const expectedChallenge = await readChallenge();
  await clearChallenge();
  if (!expectedChallenge) {
    return { error: "La demande a expiré. Merci de réessayer." };
  }

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
  });
  if (!passkey) {
    return { error: "Passkey inconnue. Connectez-vous et enregistrez-la." };
  }

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: deserializeTransports(passkey.transports),
      },
    });
  } catch {
    return { error: "La passkey n'a pas pu être vérifiée." };
  }

  if (!verification.verified) {
    return { error: "La passkey n'a pas pu être vérifiée." };
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });

  await createSession(passkey.userId);
  return { ok: true };
}
