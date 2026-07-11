import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import ArtistPage from "@/features/Artist/pages";
import type { DeezerArtistDetail, DeezerTrack } from "@/lib/deezer";
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
  const artist = await fetchDeezer<DeezerArtistDetail>(`/artist/${id}`);
  if (!artist) notFound();

  const topTracksPayload = await fetchDeezer<{ data: DeezerTrack[] }>(
    `/artist/${id}/top?limit=25`,
  );

  const likedTracks = await prisma.likedTrack.findMany({
    where: { userId: user.id },
    select: { deezerTrackId: true },
  });

  return (
    <AppShell user={user}>
      <ArtistPage
        artist={artist}
        topTracks={topTracksPayload?.data ?? []}
        initialLikedTrackIds={likedTracks.map((track) => track.deezerTrackId)}
      />
    </AppShell>
  );
}
