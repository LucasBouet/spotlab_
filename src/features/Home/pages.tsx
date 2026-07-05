import type { User } from "!/prisma_db";
import { signOut } from "@/features/Auth/actions";

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function LibraryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 4v16" />
      <path d="M10 4v16" />
      <path d="m15 5 4 1.5v13L15 18" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Accueil", icon: HomeIcon },
  { label: "Rechercher", icon: SearchIcon },
  { label: "Bibliothèque", icon: LibraryIcon },
];

export default function HomePage({ user }: { user: User }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            S
          </div>
          <span className="text-lg font-semibold tracking-tight">Spotlab</span>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          {NAV_ITEMS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-white/70 transition hover:bg-surface-elevated hover:text-white"
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/60 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
              S
            </div>
            <span className="font-semibold tracking-tight">Spotlab</span>
          </div>

          <p className="min-w-0 flex-1 truncate text-right text-sm text-white/60 md:text-left">
            <span className="hidden sm:inline">Bienvenue, </span>
            <span className="font-medium text-white">{user.name ?? user.email}</span>
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

        <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 pb-24 text-center md:pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Votre musique commence ici</h1>
          <p className="max-w-md text-white/50">
            Le backbone de Spotlab est prêt. Ajoutez vos bibliothèques, playlists et lecteur audio à
            partir d'ici.
          </p>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface/95 pt-2 backdrop-blur md:hidden"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {NAV_ITEMS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex flex-col items-center gap-1 px-3 py-1 text-[11px] text-white/60 transition hover:text-white"
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
