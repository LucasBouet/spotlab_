import { redirect } from "next/navigation";
import HomePage from "@/features/Home/pages";
import { getCurrentUser } from "@/lib/session";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <HomePage user={user} />;
}
