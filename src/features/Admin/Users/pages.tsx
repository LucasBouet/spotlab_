import type { Role } from "!/prisma_db";
import { deleteUserAccount, setUserRole } from "@/features/Admin/actions";
import { AdminTabs } from "@/features/Admin/components/admin-tabs";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
};

export default function AdminUsersPage({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <AdminTabs />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>

        <ul className="flex flex-col divide-y divide-border">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const nextRole: Role = user.role === "ADMIN" ? "USER" : "ADMIN";

            return (
              <li key={user.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {user.name ?? user.email}
                    {isSelf && (
                      <span className="ml-2 text-xs text-white/40">(vous)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-white/50">{user.email}</p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    user.role === "ADMIN"
                      ? "bg-brand/20 text-brand"
                      : "bg-surface-elevated text-white/60"
                  }`}
                >
                  {user.role === "ADMIN" ? "Admin" : "Utilisateur"}
                </span>

                {!isSelf && (
                  <>
                    <form action={setUserRole.bind(null, user.id, nextRole)}>
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-white/60 transition hover:border-brand hover:text-white"
                      >
                        {user.role === "ADMIN" ? "Rétrograder" : "Promouvoir"}
                      </button>
                    </form>
                    <form action={deleteUserAccount.bind(null, user.id)}>
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-white/60 transition hover:border-red-500 hover:text-red-400"
                      >
                        Supprimer
                      </button>
                    </form>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
