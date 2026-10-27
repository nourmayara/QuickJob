"use client";
import Link from "next/link";
import {useState} from "react";
import {usePathname} from "next/navigation";
import QuickJobLogo from "@/components/QuickJobLogo";
import LogoutButton from "@/components/LogoutButton";
import Icon from "@/components/recruiter/Icon";
export default function AdminShell({children}:{children:React.ReactNode}){
 const [open,setOpen]=useState(false);const pathname=usePathname();
 return <div className="rq-app"><a className="rq-skip" href="#admin-content">Aller au contenu</a>{open&&<button className="rq-overlay" onClick={()=>setOpen(false)} aria-label="Fermer la navigation"/>}
  <aside className={`rq-sidebar ${open?"is-open":""}`} aria-label="Espace administrateur"><div className="rq-brand"><Link href="/dashboard/administrateur" aria-label="QuickJob, administration"><QuickJobLogo/></Link><button className="rq-mobile-close rq-icon-button" onClick={()=>setOpen(false)} aria-label="Fermer la navigation"><Icon name="close"/></button></div><p className="rq-nav-label">ADMINISTRATION</p><nav id="admin-navigation" aria-label="Navigation administrateur">{[["/dashboard/administrateur","Tableau de bord"],["/admin/recruteurs","Vérification des recruteurs"]].map(([href,label])=><Link key={href} href={href} className={`rq-nav-link ${pathname.startsWith(href)?"is-active":""}`} aria-current={pathname.startsWith(href)?"page":undefined} onClick={()=>setOpen(false)}><Icon name={href.startsWith("/admin")?"people":"grid"}/><span>{label}</span></Link>)}</nav><div className="rq-sidebar-bottom"><LogoutButton/></div></aside>
  <div className="rq-workspace"><header className="rq-header"><div className="rq-header-left"><button className="rq-menu rq-icon-button" onClick={()=>setOpen(!open)} aria-label="Ouvrir la navigation" aria-expanded={open} aria-controls="admin-navigation"><Icon name="menu"/></button><strong>Administration QuickJob</strong></div></header><main className="rq-content" id="admin-content">{children}</main></div>
 </div>;
}
