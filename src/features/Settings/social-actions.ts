"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { EMAIL_REGEX } from "@/lib/validation";

export type SocialActionState = {
  error: string | null;
  success: string | null;
};

export async function sendFriendRequest(
  _prevState: SocialActionState,
  formData: FormData,
): Promise<SocialActionState> {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return { error: "Adresse e-mail invalide.", success: null };
  }
  if (email === user.email.toLowerCase()) {
    return {
      error: "Vous ne pouvez pas vous ajouter vous-même.",
      success: null,
    };
  }

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) {
    return {
      error: "Aucun utilisateur avec cette adresse e-mail.",
      success: null,
    };
  }

  // A friendship can already exist in either direction — the unique index only
  // guards the (requester, addressee) order, so we check both explicitly.
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: target.id },
        { requesterId: target.id, addresseeId: user.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return { error: "Vous êtes déjà amis.", success: null };
    }
    if (existing.requesterId === user.id) {
      return { error: "Demande déjà envoyée.", success: null };
    }
    // The target already invited us — accept that pending request instead of
    // creating a competing reverse row.
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED" },
    });
    revalidatePath("/settings");
    return { error: null, success: "Vous êtes maintenant amis." };
  }

  await prisma.friendship.create({
    data: { requesterId: user.id, addresseeId: target.id },
  });
  revalidatePath("/settings");
  return { error: null, success: "Demande envoyée." };
}

export async function acceptFriendRequest(
  id: string,
): Promise<SocialActionState> {
  const user = await requireUser();
  const row = await prisma.friendship.findUnique({ where: { id } });
  // Only the addressee of a still-pending request may accept it.
  if (!row || row.addresseeId !== user.id || row.status !== "PENDING") {
    return { error: "Demande introuvable.", success: null };
  }
  await prisma.friendship.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });
  revalidatePath("/settings");
  return { error: null, success: null };
}

export async function declineFriendRequest(
  id: string,
): Promise<SocialActionState> {
  const user = await requireUser();
  const row = await prisma.friendship.findUnique({ where: { id } });
  if (!row || row.addresseeId !== user.id || row.status !== "PENDING") {
    return { error: "Demande introuvable.", success: null };
  }
  await prisma.friendship.delete({ where: { id } });
  revalidatePath("/settings");
  return { error: null, success: null };
}

export async function cancelFriendRequest(
  id: string,
): Promise<SocialActionState> {
  const user = await requireUser();
  const row = await prisma.friendship.findUnique({ where: { id } });
  // Only the sender of a still-pending request may cancel it.
  if (!row || row.requesterId !== user.id || row.status !== "PENDING") {
    return { error: "Demande introuvable.", success: null };
  }
  await prisma.friendship.delete({ where: { id } });
  revalidatePath("/settings");
  return { error: null, success: null };
}

export async function removeFriend(id: string): Promise<SocialActionState> {
  const user = await requireUser();
  const row = await prisma.friendship.findUnique({ where: { id } });
  // Either participant may remove an accepted friendship.
  if (
    !row ||
    row.status !== "ACCEPTED" ||
    (row.requesterId !== user.id && row.addresseeId !== user.id)
  ) {
    return { error: "Ami introuvable.", success: null };
  }
  await prisma.friendship.delete({ where: { id } });
  revalidatePath("/settings");
  return { error: null, success: null };
}
