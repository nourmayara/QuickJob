import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/authorization";
export const metadata: Metadata = { title: "Créer un compte | QuickJob" };
export default async function RegisterPage() {
  if ((await requireRole()).user) redirect("/dashboard");
  return null;
}
