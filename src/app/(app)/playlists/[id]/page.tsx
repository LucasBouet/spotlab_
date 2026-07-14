import { notFound, redirect } from "next/navigation";
import PlaylistDetailPage from "@/features/Playlists/Detail/pages";
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
  const playlist = await prisma.playlist.findFirst({
    where: { id, userId: user.id },
    include: { tracks: { orderBy: { addedAt: "asc" } } },
  });
  if (!playlist) notFound();

  const likedTracks = await prisma.likedTrack.findMany({
    where: { userId: user.id },
    select: { deezerTrackId: true },
  });

  return (
    <PlaylistDetailPage
      playlistId={playlist.id}
      initialName={playlist.name}
      initialLikedTrackIds={likedTracks.map((track) => track.deezerTrackId)}
      tracks={playlist.tracks.map((track) => ({
        id: track.deezerTrackId,
        rowKey: track.id,
        title: track.title,
        duration: track.duration,
        artist: { id: track.artistId ?? undefined, name: track.artistName },
        album: { title: track.albumTitle, cover_medium: track.albumCover },
      }))}
    />
  );
}
