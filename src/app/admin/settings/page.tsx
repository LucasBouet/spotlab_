import { AppShell } from "@/components/app-shell";
import AdminSettingsPage from "@/features/Admin/Settings/pages";
import { requireAdmin } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";

export default async function Page() {
  const user = await requireAdmin();
  const settings = await getAppSettings();

  return (
    <AppShell user={user}>
      <AdminSettingsPage settings={settings} />
    </AppShell>
  );
}
