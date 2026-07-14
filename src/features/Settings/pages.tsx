import type { UserSettingKey } from "@/config/settings";
import type { PasskeyInfo } from "@/features/Settings/components/passkey-panel";
import { SettingsView } from "@/features/Settings/components/settings-view";
import type { SocialData } from "@/lib/social-types";

export default function SettingsPage({
  name,
  email,
  userSettings,
  social,
  passkeys,
}: {
  name: string | null;
  email: string;
  userSettings: Record<UserSettingKey, string>;
  social: SocialData;
  passkeys: PasskeyInfo[];
}) {
  return (
    <SettingsView
      name={name}
      email={email}
      userSettings={userSettings}
      social={social}
      passkeys={passkeys}
    />
  );
}
