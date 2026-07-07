"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type LikeTrackInput = {
  deezerTrackId: number;
  title: string;
  artistName: string;
  albumTitle: string;
  albumCover: string;
  duration: number;
};

export async function likeTrack(input: LikeTrackInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  await prisma.likedTrack.upsert({
    where: {
      userId_deezerTrackId: {
        userId: user.id,
        deezerTrackId: input.deezerTrackId,
      },
    },
    update: {},
    create: { ...input, userId: user.id },
  });

  revalidatePath("/library");
}

export async function unlikeTrack(deezerTrackId: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  await prisma.likedTrack.deleteMany({
    where: { userId: user.id, deezerTrackId },
  });

  revalidatePath("/library");
}

export async function isTrackLiked(deezerTrackId: number): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const existing = await prisma.likedTrack.findUnique({
    where: { userId_deezerTrackId: { userId: user.id, deezerTrackId } },
    select: { id: true },
  });

  return existing !== null;
}
