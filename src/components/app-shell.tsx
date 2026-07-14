import type { User } from "!/prisma_db";
import type { ReactNode } from "react";
import { MobileNav, SidebarNav } from "@/components/nav-items";
import { ResizableSidebar } from "@/components/resizable-sidebar";
import { signOut } from "@/features/Auth/actions";
import { DevicesPanel } from "@/features/Player/components/devices-panel";
import { NowPlayingView } from "@/features/Player/components/now-playing";
import { PlayerBar } from "@/features/Player/components/player-bar";
import { QueuePanel } from "@/features/Player/components/queue-panel";
import { isAdmin } from "@/lib/rbac";
import { getAppSetting } from "@/lib/settings";

export async function AppShell({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const siteName = await getAppSetting("site_name");
  const admin = isAdmin(user);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <ResizableSidebar>
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            {siteName.charAt(0).toUpperCase()}
          </div>
          <span className="text-lg font-semibold tracking-tight">
            {siteName}
          </span>
        </div>

        <SidebarNav isAdmin={admin} />
      </ResizableSidebar>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
              {siteName.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold tracking-tight">{siteName}</span>
          </div>

          <p className="min-w-0 flex-1 truncate text-right text-sm text-white/60 md:text-left">
            <span className="hidden sm:inline">Bienvenue, </span>
            <span className="font-medium text-white">
              {user.name ?? user.email}
            </span>
          </p>

          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-white/70 transition hover:border-brand hover:text-white"
            >
              Déconnexion
            </button>
          </form>
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
          {children}
        </main>

        <div className="flex shrink-0 flex-col">
          <PlayerBar />
          <MobileNav isAdmin={admin} />
        </div>
      </div>

      <QueuePanel />
      <DevicesPanel />
      <NowPlayingView />
    </div>
  );
}
