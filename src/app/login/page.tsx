import { redirect } from "next/navigation";
import LoginPage from "@/features/Auth/Login/pages";
import { getCurrentUser } from "@/lib/session";

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <LoginPage />;
}
