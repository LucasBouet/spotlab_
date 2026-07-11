import type { UserSettingKey } from "@/config/settings";
import { ImportPlaylistForm } from "@/features/Settings/components/import-playlist-form";
import { PasswordForm } from "@/features/Settings/components/password-form";
import { PreferencesForm } from "@/features/Settings/components/preferences-form";
import { ProfileForm } from "@/features/Settings/components/profile-form";

export default function SettingsPage({
  name,
  email,
  userSettings,
}: {
  name: string | null;
  email: string;
  userSettings: Record<UserSettingKey, string>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>

      <ProfileForm name={name} email={email} />
      <PreferencesForm settings={userSettings} />
      <ImportPlaylistForm />
      <PasswordForm />
    </div>
  );
}
