import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import LibraryPage from "@/features/Library/pages";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getUserSettings } from "@/lib/settings";

const SORT_ORDER_BY = {
  recent: { createdAt: "desc" },
  title: { title: "asc" },
  artist: { artistName: "asc" },
} as const;

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { library_sort_order: sortOrder } = await getUserSettings(user.id);

  const likedTracks = await prisma.likedTrack.findMany({
    where: { userId: user.id },
    orderBy:
      SORT_ORDER_BY[sortOrder as keyof typeof SORT_ORDER_BY] ??
      SORT_ORDER_BY.recent,
  });

  return (
    <AppShell user={user}>
      <LibraryPage likedTracks={likedTracks} />
    </AppShell>
  );
}
