import type { Metadata } from "next";
import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
import "./recruiter.css";

export const metadata: Metadata = { title: { default: "Espace recruteur | QuickJob", template: "%s | QuickJob" }, robots: { index: false, follow: false } };
export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["RECRUTEUR"]);
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { companyName: true } });
  return <RecruiterShell name={`${user.firstName} ${user.name}`.trim()} company={profile?.companyName ?? null}>{children}</RecruiterShell>;
}
