import SettingsPage from "@/features/Settings/pages";
import { getSocialData } from "@/lib/friends";
import { requireUser } from "@/lib/rbac";
import { getUserSettings } from "@/lib/settings";

export default async function Page() {
  const user = await requireUser();
  const [userSettings, social] = await Promise.all([
    getUserSettings(user.id),
    getSocialData(user.id),
  ]);

  return (
    <SettingsPage
      name={user.name}
      email={user.email}
      userSettings={userSettings}
      social={social}
    />
  );
}
