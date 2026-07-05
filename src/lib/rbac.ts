import type { User } from "!/prisma_db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN";
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/");
  return user;
}
