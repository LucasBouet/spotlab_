import AdminSettingsPage from "@/features/Admin/Settings/pages";
import { requireAdmin } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";

export default async function Page() {
  await requireAdmin();
  const settings = await getAppSettings();

  return <AdminSettingsPage settings={settings} />;
}
