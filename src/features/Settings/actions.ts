"use server";

import { revalidatePath } from "next/cache";
import { USER_SETTINGS } from "@/config/settings";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { setUserSetting } from "@/lib/settings";
import { EMAIL_REGEX } from "@/lib/validation";

export type SettingsFormState = {
  error: string | null;
  success: boolean;
};

export async function updateProfile(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !EMAIL_REGEX.test(email)) {
    return { error: "Adresse e-mail invalide.", success: false };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id) {
    return { error: "Un compte existe déjà avec cet e-mail.", success: false };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name || null, email },
  });
  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function updatePassword(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "");

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { error: "Mot de passe actuel incorrect.", success: false };
  }
  if (newPassword.length < 8) {
    return {
      error: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      success: false,
    };
  }
  if (newPassword !== confirmNewPassword) {
    return { error: "Les mots de passe ne correspondent pas.", success: false };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { error: null, success: true };
}

export async function updateUserPreferences(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireUser();

  for (const definition of USER_SETTINGS) {
    const value = String(formData.get(definition.key) ?? "").trim();
    if (value) await setUserSetting(user.id, definition.key, value);
  }

  revalidatePath("/settings");
  revalidatePath("/library");
  return { error: null, success: true };
}
