import type { User } from "!/prisma_db";
import { AppShell } from "@/components/app-shell";

export default function HomePage({ user }: { user: User }) {
  return (
    <AppShell user={user}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Votre musique commence ici</h1>
        <p className="max-w-md text-white/50">
          Le backbone de Spotlab est prêt. Ajoutez vos bibliothèques, playlists et lecteur audio à
          partir d'ici.
        </p>
      </div>
    </AppShell>
  );
}
