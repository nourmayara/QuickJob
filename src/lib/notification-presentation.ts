import { recruiterApprovalPath } from "./recruiter-approval";
import type { IconName } from "@/components/recruiter/Icon";

// Legacy notifications have no target IDs: keep them useful without guessing an owner.
export function notificationPresentation(n: { message: string; kind?: string | null; missionId?: number | null; applicationId?: number | null; verificationId?: number | null }, role: string, approval?: string | null): { title: string; icon: IconName; href: string } {
  const message = n.message.toLocaleLowerCase("fr-FR");
  const kind = n.verificationId ? "VERIFICATION" : n.kind || (/message|conversation/.test(message) ? "MESSAGE" : /candidature/.test(message) ? "APPLICATION" : /mission/.test(message) ? "MISSION" : "ACCOUNT");
  const base = role === "RECRUTEUR" ? "/recruteur" : "/dashboard/travailleur";
  const titles: Record<string, [string, IconName]> = { MESSAGE: ["Nouveau message", "mail"], APPLICATION: ["Suivi de candidature", "briefcase"], MISSION: ["Mission actualisée", "briefcase"], VERIFICATION: ["Vérification du compte", "shield"], ACCOUNT: ["Information QuickJob", "shield"] };
  if (kind === "REPORT") titles.REPORT = ["Nouveau signalement", "shield"];
  const [title, icon] = titles[kind] || titles.ACCOUNT;
  let href = role === "ADMIN" ? "/dashboard/administrateur" : `${base}/profil`;
  if (role === "ADMIN") {
    if (kind === "MISSION") href = n.missionId ? `/admin/missions/${n.missionId}` : "/admin/missions";
    else if (kind === "VERIFICATION") href = "/admin/recruteurs";
    else if (/signalement/.test(message)) href = "/admin/signalements";
  } else if (role === "RECRUTEUR" && (kind === "VERIFICATION" || approval !== "APPROUVE")) href = recruiterApprovalPath(approval);
  else if (kind === "MESSAGE") href = `${base}/messages${n.applicationId ? `?application=${n.applicationId}` : ""}`;
  else if (kind === "APPLICATION") href = `${base}/candidatures${n.applicationId ? `/${n.applicationId}` : ""}`;
  else if (kind === "MISSION") href = `${base}/missions${n.missionId ? `/${n.missionId}` : ""}`;
  return { title, icon, href };
}
