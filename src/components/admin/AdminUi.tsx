import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import SoftIcon from "@/components/SoftIcon";

export function AdminPageHeader({ icon, title, description, action }: { icon: IconName; title: string; description: string; action?: ReactNode }) {
  return <header className="qa-admin-header"><SoftIcon name={icon} size={28} /><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="qa-admin-header-action">{action}</div>}</header>;
}

export function AdminListCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="qa-admin-list-card"><div className="qa-admin-list-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>{children}</section>;
}

export function AdminEmpty({ icon = "document", children }: { icon?: IconName; children: ReactNode }) {
  return <div className="qa-admin-empty"><Icon name={icon} size={25} /><p>{children}</p></div>;
}
