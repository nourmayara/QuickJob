import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
export const metadata: Metadata = { title: "Connexion | QuickJob" };
export default async function LoginPage() {
  if ((await requireRole()).user) redirect("/dashboard");
  return null;
}
