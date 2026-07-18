import { redirect } from "next/navigation";
import HomePage from "@/features/Home/pages";
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
    <HomePage
      initialLikedTrackIds={likedTracks.map((track) => track.deezerTrackId)}
    />
  );
}
