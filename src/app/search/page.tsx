import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import SearchPage from "@/features/Search/pages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const likedTracks = await prisma.likedTrack.findMany({
    where: { userId: user.id },
    select: { deezerTrackId: true },
  });

  return (
    <AppShell user={user}>
      <SearchPage initialLikedTrackIds={likedTracks.map((track) => track.deezerTrackId)} />
    </AppShell>
  );
}
