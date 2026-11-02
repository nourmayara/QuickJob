"use client";
import Link from "next/link";
import { useState } from "react";
import QuickJobLogo from "@/components/QuickJobLogo";
import Icon from "@/components/recruiter/Icon";
export default function CityNavigation({ goTo }: { goTo: (progress: number) => void }) {
 const [open, setOpen] = useState(false);
 const links: [string, number][] = [["Accueil",0],["Explorer les missions",.265],["Comment ça marche",.47],["Pour les recruteurs",.62]];
 return <header className="city-header"><a className="city-brand" href="#accueil" aria-label="QuickJob, accueil" onClick={e => { e.preventDefault(); goTo(0); }}><QuickJobLogo priority /></a>
  <nav id="city-menu" className={open ? "is-open" : ""} aria-label="Navigation principale">{links.map(([name,p]) => <a key={name} href="#accueil" onClick={e => { e.preventDefault(); goTo(p); setOpen(false); }}>{name}</a>)}<div className="city-mobile-auth"><Link href="/login">Connexion</Link><Link href="/register">Inscription <Icon name="arrow" size={17} /></Link></div></nav>
  <div className="city-account"><Link href="/login">Connexion</Link><Link href="/register">Inscription <Icon name="arrow" size={17} /></Link></div><button className="city-menu-button" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-controls="city-menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
 </header>;
}
