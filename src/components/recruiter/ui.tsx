import Link from "next/link";
import type { ReactNode } from "react";
import { missionStatuses, applicationStatuses } from "@/lib/recruiter-validation";
import Icon, { type IconName } from "./Icon";
import SoftIcon from "@/components/SoftIcon";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  const headingIcon: IconName | undefined = /profil/i.test(title) ? "user" : /paramètres/i.test(title) ? "settings" : /notification/i.test(title) ? "bell" : /message|conversation/i.test(title) ? "message" : /favori/i.test(title) ? "heart" : /candidature/i.test(title) ? "document" : /calendrier/i.test(title) ? "calendar" : /catégor/i.test(title) ? "layers" : /mission/i.test(title) ? "briefcase" : undefined;
  return <div className="rq-page-heading"><div>{eyebrow && <p className="rq-eyebrow">{eyebrow}</p>}<h1>{headingIcon && <SoftIcon name={headingIcon} className="qj-heading-icon" size={23} />}{title}</h1><p>{description}</p></div>{action}</div>;
}
export function PublishLink() { return <Link className="rq-button rq-primary" href="/recruteur/missions/nouvelle"><Icon name="plus" size={18} />Publier une mission</Link>; }
export function Badge({ status, application = false }: { status: string; application?: boolean }) {
  const labels: Record<string, string> = application ? applicationStatuses : missionStatuses;
  return <span className={`rq-badge rq-status-${status.toLowerCase()}`}><i />{labels[status] ?? status}</span>;
}
export function EmptyState({ icon = "briefcase", title, children, action }: { icon?: IconName; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="rq-empty"><SoftIcon name={icon} size={27} className="rq-empty-icon" /><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function Panel({ title, description, action, children, className = "" }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`rq-panel ${className}`}><div className="rq-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}
export function Avatar({ name }: { name: string }) { return <span className="rq-avatar">{name.split(" ").map(v => v[0]).slice(0, 2).join("").toUpperCase()}</span>; }
export function formatDate(value: Date | null) { return value ? value.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Tunis" }) : "Date à préciser"; }
