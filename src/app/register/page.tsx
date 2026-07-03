import { redirect } from "next/navigation";
import RegisterPage from "@/features/Auth/Register/pages";
import { getCurrentUser } from "@/lib/session";

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <RegisterPage />;
}
