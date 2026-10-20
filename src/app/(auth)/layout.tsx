import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
import AuthExperience from "@/components/auth/AuthExperience";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireRole();
  if (auth.user) redirect("/dashboard");
  return <AuthExperience>{children}</AuthExperience>;
}
