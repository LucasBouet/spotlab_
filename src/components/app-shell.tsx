import type { User } from "!/prisma_db";
import type { ReactNode } from "react";
import { MobileNav, SidebarNav } from "@/components/nav-items";
import { ResizableSidebar } from "@/components/resizable-sidebar";
import { MobileSearchButton, SearchBar } from "@/components/search-bar";
import { SwipeGestures } from "@/components/swipe-gestures";
import { signOut } from "@/features/Auth/actions";
import { JamInviteToast } from "@/features/Jam/components/jam-invite-toast";
import { DevicesPanel } from "@/features/Player/components/devices-panel";
import { NowPlayingView } from "@/features/Player/components/now-playing";
import { PlayerBar } from "@/features/Player/components/player-bar";
import { QueuePanel } from "@/features/Player/components/queue-panel";
import { SearchProvider } from "@/features/Search/search-context";
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

      <SearchProvider>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="grid shrink-0 grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
            <div className="col-start-1 flex min-w-0 items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white md:hidden">
                {siteName.charAt(0).toUpperCase()}
              </div>
            </div>

            <SearchBar className="col-start-2 w-full" />

            <div className="col-start-3 flex min-w-0 items-center justify-end gap-3">
              <MobileSearchButton />

              <p className="hidden max-w-[14rem] truncate text-sm text-white/60 md:block">
                <span className="hidden lg:inline">Bienvenue, </span>
                <span className="font-medium text-white">
                  {user.name ?? user.email}
                </span>
              </p>

              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-white/70 transition hover:border-brand hover:text-white"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </header>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
            {children}
          </main>

          <div className="flex shrink-0 flex-col">
            <PlayerBar />
            <MobileNav isAdmin={admin} />
          </div>
        </div>
      </SearchProvider>

      <QueuePanel />
      <DevicesPanel />
      <NowPlayingView />
      <JamInviteToast />
      <SwipeGestures />
    </div>
  );
}
