"use client";
import PendingRecruiters from "./PendingRecruiters";
import Link from "next/link";
import NotificationIndicator from "@/components/communication/NotificationIndicator";
import { useState } from "react";
import { usePathname } from "next/navigation";
import QuickJobLogo from "@/components/QuickJobLogo";
import LogoutButton from "@/components/LogoutButton";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import SoftIcon from "@/components/SoftIcon";

const adminLinks: [string, string, IconName][] = [
  ["/dashboard/administrateur", "Tableau de bord", "home"],
  ["/admin/utilisateurs", "Utilisateurs", "people"],
  ["/admin/recruteurs", "Vérification des recruteurs", "shield"],
  ["/admin/missions", "Missions", "briefcase"],
  ["/admin/signalements", "Signalements", "mail"],
  ["/admin/categories", "Catégories", "layers"],
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <div className="rq-app qj-platform-shell qj-admin-shell">
    <a className="rq-skip" href="#admin-content">Aller au contenu</a>
    {open && <button className="rq-overlay" onClick={() => setOpen(false)} aria-label="Fermer la navigation" />}
    <aside className={`rq-sidebar ${open ? "is-open" : ""}`} aria-label="Espace administrateur">
      <div className="rq-brand"><Link href="/dashboard/administrateur" aria-label="QuickJob, administration"><QuickJobLogo priority /></Link><button className="rq-mobile-close rq-icon-button" onClick={() => setOpen(false)} aria-label="Fermer la navigation"><Icon name="close" /></button></div>
      <p className="rq-nav-label">ADMINISTRATION</p>
      <nav id="admin-navigation" aria-label="Navigation administrateur">{adminLinks.map(([href, label, icon]) => {
        const active = pathname.startsWith(href);
        return <Link key={href} href={href} className={`rq-nav-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><Icon name={icon} /><span>{label}{href === "/admin/recruteurs" && <PendingRecruiters />}</span>{active && <i />}</Link>;
      })}</nav>
      <div className="qj-admin-emblem" aria-hidden="true"><SoftIcon name="shield" size={38} /><span>Administration sécurisée</span></div>
      <div className="rq-sidebar-bottom"><LogoutButton /></div>
    </aside>
    <div className="rq-workspace"><header className="rq-header"><div className="rq-header-left"><button className="rq-menu rq-icon-button" onClick={() => setOpen(!open)} aria-label="Ouvrir la navigation" aria-expanded={open} aria-controls="admin-navigation"><Icon name="menu" /></button><strong>Administration QuickJob</strong></div><NotificationIndicator /></header><main className="rq-content" id="admin-content">{children}</main></div>
  </div>;
}
