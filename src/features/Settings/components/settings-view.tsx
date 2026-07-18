"use client";

import { useState } from "react";
import type { UserSettingKey } from "@/config/settings";
import { ImportPlaylistForm } from "@/features/Settings/components/import-playlist-form";
import {
  type PasskeyInfo,
  PasskeyPanel,
} from "@/features/Settings/components/passkey-panel";
import { PasswordForm } from "@/features/Settings/components/password-form";
import { PreferencesForm } from "@/features/Settings/components/preferences-form";
import { ProfileForm } from "@/features/Settings/components/profile-form";
import { SocialPanel } from "@/features/Settings/components/social-panel";
import { StatsPanel } from "@/features/Settings/components/stats-panel";
import type { ListeningStats } from "@/features/Settings/stats";
import type { SocialData } from "@/lib/social-types";

type Tab = "social" | "songs" | "stats" | "configuration";

const TABS: { id: Tab; label: string }[] = [
  { id: "social", label: "Social" },
  { id: "songs", label: "Titres" },
  { id: "stats", label: "Statistiques" },
  { id: "configuration", label: "Configuration" },
];

export function SettingsView({
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
  const [tab, setTab] = useState<Tab>("social");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>

      <nav className="flex gap-1 border-b border-border">
        {TABS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-t-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "border-b-2 border-brand text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === "social" && <SocialPanel initialData={social} />}

      {tab === "songs" && (
        <div className="flex flex-col gap-6">
          <PreferencesForm settings={userSettings} />
          <ImportPlaylistForm />
        </div>
      )}

      {tab === "stats" && <StatsPanel stats={stats} />}

      {tab === "configuration" && (
        <div className="flex flex-col gap-6">
          <ProfileForm name={name} email={email} />
          <PasswordForm />
          <PasskeyPanel passkeys={passkeys} />
        </div>
      )}
    </div>
  );
}
