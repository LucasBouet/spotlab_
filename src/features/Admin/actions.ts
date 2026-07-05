"use server";

import { revalidatePath } from "next/cache";
import { APP_SETTINGS } from "@/config/settings";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { setAppSetting } from "@/lib/settings";

export type AdminSettingsState = {
  error: string | null;
  success: boolean;
};

export async function updateAppSettings(
  _prevState: AdminSettingsState,
  formData: FormData,
): Promise<AdminSettingsState> {
  await requireAdmin();

  for (const definition of APP_SETTINGS) {
    if (definition.type === "boolean") {
      await setAppSetting(
        definition.key,
        formData.get(definition.key) === "on" ? "true" : "false",
      );
    } else {
      const value = String(formData.get(definition.key) ?? "").trim();
      if (value) await setAppSetting(definition.key, value);
    }
  }

  revalidatePath("/admin/settings");
  return { error: null, success: true };
}

export async function setUserRole(
  userId: string,
  role: "ADMIN" | "USER",
): Promise<void> {
  const currentAdmin = await requireAdmin();
  if (currentAdmin.id === userId) {
    throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const currentAdmin = await requireAdmin();
  if (currentAdmin.id === userId) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}
