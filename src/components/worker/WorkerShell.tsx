"use client";
import NotificationIndicator from "@/components/communication/NotificationIndicator";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import QuickJobLogo from "@/components/QuickJobLogo";
import LogoutButton from "@/components/LogoutButton";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import Image from "next/image";

const base = "/dashboard/travailleur";
const links: [string, string, IconName][] = [["", "Mon espace", "home"], ["missions", "Trouver une mission", "search"], ["calendrier", "Mon calendrier", "calendar"], ["candidatures", "Mes candidatures", "document"], ["favoris", "Mes favoris", "heart"], ["messages", "Messages", "message"], ["profil", "Mon profil professionnel", "user"]];
export default function WorkerShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (slug: string) => slug ? pathname.startsWith(`${base}/${slug}`) : pathname === base;
  const title = links.find(([slug]) => active(slug))?.[1] || "Espace travailleur";
  return <div className="rq-app wk-app qj-platform-shell qj-worker-shell"><a href="#worker-content" className="rq-skip">Aller au contenu</a>{open && <button className="rq-overlay" aria-label="Fermer la navigation" onClick={() => setOpen(false)} />}
    <aside className={`rq-sidebar ${open ? "is-open" : ""}`} aria-label="Espace travailleur"><div className="rq-brand"><Link href={base} onClick={() => setOpen(false)} aria-label="QuickJob, mon espace travailleur"><QuickJobLogo priority /></Link><button className="rq-mobile-close rq-icon-button" aria-label="Fermer la navigation" onClick={() => setOpen(false)}><Icon name="close" /></button></div><p className="rq-nav-label">ESPACE TRAVAILLEUR</p>
      <nav id="worker-navigation" aria-label="Navigation principale">{links.map(([slug, label, icon]) => <Link key={slug} href={`${base}${slug ? `/${slug}` : ""}`} className={`rq-nav-link ${active(slug) ? "is-active" : ""}`} aria-current={active(slug) ? "page" : undefined} onClick={() => setOpen(false)}><Icon name={icon} /><span>{label}</span>{active(slug) && <i />}</Link>)}</nav>
      <div className="wk-sidebar-tip"><Icon name="briefcase" size={23} /><strong>Une mission à votre rythme</strong><p>Présentez vos compétences et trouvez votre prochaine opportunité.</p><Link href={`${base}/profil`}>Compléter mon profil <Icon name="arrow" size={14} /></Link></div>
      <div className="qj-sidebar-character qj-sidebar-worker" aria-hidden="true"><Image src="/images/role-worker-clay.png" alt="" width={220} height={220} sizes="170px" loading="eager" /></div>
      <div className="rq-sidebar-bottom"><div className="rq-account"><span className="rq-avatar">{name[0]?.toUpperCase()}</span><div><strong>{name}</strong><span>Compte travailleur</span></div></div><LogoutButton /></div>
    </aside>
    <div className="rq-workspace"><header className="rq-header"><div className="rq-header-left"><button className="rq-menu rq-icon-button" aria-label="Ouvrir la navigation" aria-expanded={open} aria-controls="worker-navigation" onClick={() => setOpen(!open)}><Icon name="menu" /></button><span>Espace travailleur <span className="rq-breadcrumb">/</span><strong>{title}</strong></span></div><NotificationIndicator /><Link href={`${base}/profil`} className="rq-header-profile"><span className="rq-header-name">{name}<small>Travailleur</small></span><span className="rq-avatar">{name[0]?.toUpperCase()}</span></Link></header><main className="rq-content" id="worker-content">{children}</main><footer className="rq-footer"><span>© {new Date().getFullYear()} QuickJob</span><span>Votre prochaine opportunité commence ici.</span></footer></div>
  </div>;
}
