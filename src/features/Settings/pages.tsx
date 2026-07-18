import type { UserSettingKey } from "@/config/settings";
import type { PasskeyInfo } from "@/features/Settings/components/passkey-panel";
import { SettingsView } from "@/features/Settings/components/settings-view";
import type { ListeningStats } from "@/features/Settings/stats";
import type { SocialData } from "@/lib/social-types";

export default function SettingsPage({
  name,
  email,
  userSettings,
  social,
  passkeys,
  stats,
}: {
  name: string | null;
  email: string;
  userSettings: Record<UserSettingKey, string>;
  social: SocialData;
  passkeys: PasskeyInfo[];
  stats: ListeningStats;
}) {
  return (
    <SettingsView
      name={name}
      email={email}
      userSettings={userSettings}
      social={social}
      passkeys={passkeys}
      stats={stats}
    />
  );
}
