import type { Metadata } from "next";
import { requirePageRole } from "@/lib/authorization";
import "./recruiter.css";
import "../premium-dashboard.css";
import "./recruiter-dashboard.css";

export const metadata: Metadata = { title: { default: "Espace recruteur | QuickJob", template: "%s | QuickJob" }, robots: { index: false, follow: false } };
export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["RECRUTEUR"], { allowUnapprovedRecruiter: true });
  return children;
}
