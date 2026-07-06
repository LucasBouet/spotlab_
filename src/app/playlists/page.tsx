import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import PlaylistsPage from "@/features/Playlists/List/pages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      tracks: {
        orderBy: { addedAt: "desc" },
        take: 4,
        select: { albumCover: true },
      },
      _count: { select: { tracks: true } },
    },
  });

  return (
    <AppShell user={user}>
      <PlaylistsPage
        playlists={playlists.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          trackCount: playlist._count.tracks,
          covers: playlist.tracks.map((track) => track.albumCover),
        }))}
      />
    </AppShell>
  );
}
