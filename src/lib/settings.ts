import {
  APP_SETTINGS,
  type AppSettingKey,
  USER_SETTINGS,
  type UserSettingKey,
} from "@/config/settings";
import { prisma } from "@/lib/prisma";

export async function getAppSettings(): Promise<Record<AppSettingKey, string>> {
  const rows = await prisma.appSetting.findMany();
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return Object.fromEntries(
    APP_SETTINGS.map((definition) => [
      definition.key,
      values.get(definition.key) ?? definition.default,
    ]),
  ) as Record<AppSettingKey, string>;
}

export async function getAppSetting(key: AppSettingKey): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return (
    APP_SETTINGS.find((definition) => definition.key === key)?.default ?? ""
  );
}

export async function setAppSetting(
  key: AppSettingKey,
  value: string,
): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getUserSettings(
  userId: string,
): Promise<Record<UserSettingKey, string>> {
  const rows = await prisma.userSetting.findMany({ where: { userId } });
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return Object.fromEntries(
    USER_SETTINGS.map((definition) => [
      definition.key,
      values.get(definition.key) ?? definition.default,
    ]),
  ) as Record<UserSettingKey, string>;
}

export async function setUserSetting(
  userId: string,
  key: UserSettingKey,
  value: string,
): Promise<void> {
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key } },
    update: { value },
    create: { userId, key, value },
  });
}
