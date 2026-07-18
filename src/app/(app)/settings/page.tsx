import SettingsPage from "@/features/Settings/pages";
import { getListeningStats } from "@/features/Settings/stats";
import { getSocialData } from "@/lib/friends";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getUserSettings } from "@/lib/settings";

export default async function Page() {
  const user = await requireUser();
  const [userSettings, social, passkeys, stats] = await Promise.all([
    getUserSettings(user.id),
    getSocialData(user.id),
    prisma.passkey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, createdAt: true },
    }),
    getListeningStats(user.id),
  ]);

  return (
    <SettingsPage
      name={user.name}
      email={user.email}
      userSettings={userSettings}
      social={social}
      passkeys={passkeys.map((passkey) => ({
        id: passkey.id,
        name: passkey.name,
        createdAt: passkey.createdAt.toISOString(),
      }))}
      stats={stats}
    />
  );
}
