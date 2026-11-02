"use client";
import Link from "next/link";
import NotificationIndicator from "@/components/communication/NotificationIndicator";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import QuickJobLogo from "@/components/QuickJobLogo";
import LogoutButton from "@/components/LogoutButton";
import Icon, { type IconName } from "./Icon";

const links: [string, string, IconName][] = [
  ["dashboard", "Tableau de bord", "home"], ["missions", "Mes missions", "briefcase"],
  ["missions/nouvelle", "Publier une mission", "plus"], ["candidatures", "Candidatures", "document"],
  ["travailleurs", "Travailleurs sélectionnés", "check"], ["messages", "Messages", "message"],
  ["profil", "Mon profil", "user"], ["parametres", "Paramètres", "settings"],
];
export default function RecruiterShell({ children, name, company }: { children: React.ReactNode; name: string; company: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isDashboard = pathname === "/recruteur/dashboard";
  function active(path: string) {
    if (path === "missions") return pathname.startsWith("/recruteur/missions") && !pathname.endsWith("/nouvelle");
    return pathname === `/recruteur/${path}` || pathname.startsWith(`/recruteur/${path}/`);
  }
  const title = links.find(([path]) => active(path))?.[1] ?? "Espace recruteur";
  return <div className={`rq-app qj-platform-shell qj-recruiter-shell ${isDashboard ? "rq-recruiter-dashboard" : ""}`}>
    <a href="#recruiter-content" className="rq-skip">Aller au contenu</a>
    {open && <button className="rq-overlay" onClick={() => setOpen(false)} aria-label="Fermer la navigation" />}
    <aside className={`rq-sidebar ${open ? "is-open" : ""}`} aria-label="Espace recruteur">
      <div className="rq-brand"><Link href="/recruteur/dashboard" aria-label="QuickJob, tableau de bord" onClick={() => setOpen(false)}><QuickJobLogo priority /></Link><button type="button" className="rq-mobile-close rq-icon-button" onClick={() => setOpen(false)} aria-label="Fermer la navigation"><Icon name="close" /></button></div>
      <p className="rq-nav-label">ESPACE RECRUTEUR</p>
      <nav id="recruiter-navigation" aria-label="Navigation principale">{links.map(([path, label, icon], i) => <Link key={path} href={`/recruteur/${path}`} className={`rq-nav-link ${active(path) ? "is-active" : ""} ${i === 6 ? "rq-nav-separated" : ""}`} aria-current={active(path) ? "page" : undefined} onClick={() => setOpen(false)}><Icon name={icon} /><span>{label}</span>{active(path) && <i />}</Link>)}</nav>
      <div className={`qj-sidebar-character qj-sidebar-recruiter ${isDashboard ? "rqd-sidebar-character" : ""}`} aria-hidden="true"><Image src="/images/role-recruiter-clay.png" alt="" width={220} height={220} sizes="182px" loading="eager" /></div>
      <div className="rq-sidebar-bottom"><div className="rq-account"><span className="rq-avatar">{name.slice(0, 1).toUpperCase()}</span><div><strong>{company || name}</strong><span>Compte recruteur</span></div></div><LogoutButton /></div>
    </aside>
    <div className="rq-workspace"><header className="rq-header"><div className="rq-header-left"><button type="button" className="rq-menu rq-icon-button" onClick={() => setOpen(!open)} aria-label="Ouvrir la navigation" aria-expanded={open} aria-controls="recruiter-navigation"><Icon name="menu" /></button><span>Espace recruteur <span className="rq-breadcrumb">/</span> <strong>{title}</strong></span></div><NotificationIndicator /><Link href="/recruteur/profil" className="rq-header-profile"><span className="rq-header-name">{name}<small>Recruteur</small></span><span className="rq-avatar">{name.slice(0, 1).toUpperCase()}</span></Link></header>
      <main className="rq-content" id="recruiter-content">{children}</main><footer className="rq-footer"><span>© {new Date().getFullYear()} QuickJob</span><span>Vos talents. Vos missions. Votre espace.</span></footer>
    </div>
  </div>;
}
