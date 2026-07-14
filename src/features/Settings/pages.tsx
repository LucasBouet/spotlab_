import type { UserSettingKey } from "@/config/settings";
import { SettingsView } from "@/features/Settings/components/settings-view";
import type { SocialData } from "@/lib/social-types";

export default function SettingsPage({
  name,
  email,
  userSettings,
  social,
}: {
  name: string | null;
  email: string;
  userSettings: Record<UserSettingKey, string>;
  social: SocialData;
}) {
  return (
    <SettingsView
      name={name}
      email={email}
      userSettings={userSettings}
      social={social}
    />
  );
}
