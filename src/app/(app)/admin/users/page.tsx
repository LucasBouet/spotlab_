import { AppShell } from "@/components/app-shell";
import AdminUsersPage from "@/features/Admin/Users/pages";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export default async function Page() {
  const user = await requireAdmin();

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell user={user}>
      <AdminUsersPage users={users} currentUserId={user.id} />
    </AppShell>
  );
}
