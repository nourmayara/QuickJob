"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import QuickJobLogo from "@/components/QuickJobLogo";
import Icon from "@/components/recruiter/Icon";
import { authHref, type Journey } from "@/lib/journey";
import { dashboardPath } from "@/lib/roles";

export default function CityNavigation({ journey, role, onExplore }: { journey: Journey; role: string | null; onExplore: () => void }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  function close() { setOpen(false); }
  return <header className="city-header">
    <a className="city-brand" href="#accueil" aria-label="QuickJob, accueil" onClick={close}><QuickJobLogo priority /></a>
    <nav id="city-menu" className={open ? "city-menu is-open" : "city-menu"} aria-label="Navigation principale" onKeyDown={event => { if (event.key === "Escape") { close(); toggle.current?.focus(); } }}>
      <a href="#experience" onClick={close}>Votre parcours</a>
      <button type="button" onClick={() => { onExplore(); close(); }}>Explorer la ville <Icon name="arrow" size={14} /></button>
      <a href="#fil-quickjob" onClick={close}>Comment ça marche</a>
      <div className="city-mobile-auth">{role ? <Link href={dashboardPath(role)}>Mon espace</Link> : <><Link href={authHref("login", journey)}>Connexion</Link><Link href={authHref("register", journey)}>Créer un compte</Link></>}</div>
    </nav>
    <div className="city-account">{role ? <Link className="city-header-cta" href={dashboardPath(role)}>Mon espace <Icon name="arrow" size={16} /></Link> : <><Link className="city-login-link" href={authHref("login", journey)}>Connexion</Link><Link className="city-header-cta" href={authHref("register", journey)}>S’inscrire <Icon name="arrow" size={16} /></Link></>}</div>
    <button ref={toggle} type="button" className="city-menu-button" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-controls="city-menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
  </header>;
}
