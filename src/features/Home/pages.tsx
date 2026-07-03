import type { User } from "!/prisma_db";
import { signOut } from "@/features/Auth/actions";

const NAV_ITEMS = ["Accueil", "Rechercher", "Bibliothèque"];

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
          {NAV_ITEMS.map((label) => (
            <a
              key={label}
              href="#"
              className="rounded-lg px-3 py-2 text-white/70 transition hover:bg-surface-elevated hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface/60 px-6 py-4 backdrop-blur">
          <p className="text-sm text-white/60">
            Bienvenue, <span className="font-medium text-white">{user.name ?? user.email}</span>
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-white/70 transition hover:border-brand hover:text-white"
            >
              Déconnexion
            </button>
          </form>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Votre musique commence ici</h1>
          <p className="max-w-md text-white/50">
            Le backbone de Spotlab est prêt. Ajoutez vos bibliothèques, playlists et lecteur audio à
            partir d'ici.
          </p>
        </main>
      </div>
    </div>
  );
}
