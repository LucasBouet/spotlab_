import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import AlbumPage from "@/features/Album/pages";
import type { DeezerAlbumDetail } from "@/lib/deezer";
import { fetchDeezer } from "@/lib/deezer";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const album = await fetchDeezer<DeezerAlbumDetail>(`/album/${id}`);
  if (!album) notFound();

  const likedTracks = await prisma.likedTrack.findMany({
    where: { userId: user.id },
    select: { deezerTrackId: true },
  });

  return (
    <AppShell user={user}>
      <AlbumPage
        album={album}
        initialLikedTrackIds={likedTracks.map((track) => track.deezerTrackId)}
      />
    </AppShell>
  );
}
