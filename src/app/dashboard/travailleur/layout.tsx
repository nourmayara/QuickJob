import type { Metadata } from "next";
import { requirePageRole } from "@/lib/authorization";
import WorkerShell from "@/components/worker/WorkerShell";
import "@/app/recruteur/recruiter.css";
import "./worker.css";
import "@/app/premium-dashboard.css";
export const metadata: Metadata = { title: "Mon espace travailleur | QuickJob", robots: { index: false, follow: false } };
export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  return <WorkerShell name={`${user.firstName} ${user.name}`.trim()}>{children}</WorkerShell>;
}
