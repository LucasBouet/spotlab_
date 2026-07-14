"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type LikeTrackInput = {
  deezerTrackId: number;
  title: string;
  artistName: string;
  artistId?: number;
  albumTitle: string;
  albumCover: string;
  duration: number;
};

export async function likeTrack(input: LikeTrackInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  // Deezer occasionally returns delisted/withdrawn tracks (missing cover art
  // or title) from search/album/artist endpoints. Storing one would later
  // crash next/image when rendering it back (empty `src`), so reject it here
  // the same way playlist imports already filter these out.
  if (!input.title || !input.albumCover) {
    throw new Error("Ce titre n'est pas disponible.");
  }

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
