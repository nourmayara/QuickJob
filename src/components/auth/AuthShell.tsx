"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import QuickJobLogo from "@/components/QuickJobLogo";
import "./auth.css";

type Role = "TRAVAILLEUR" | "RECRUTEUR";

function MissionCard({ icon, title, city, pay, className = "" }: { icon: string; title: string; city: string; pay: string; className?: string }) {
  return <article className={`visual-card mission-preview ${className}`}><span className="visual-card-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>⌖ {city}</small></span><b>{pay}</b></article>;
}

function AuthVisual({ variant, role }: { variant: "login" | "register"; role: Role }) {
  const recruiter = variant === "register" && role === "RECRUTEUR";
  return <aside className={`auth-visual ${recruiter ? "is-recruiter" : "is-worker"}`} aria-label={recruiter ? "Aperçu du parcours recruteur" : "Aperçu du parcours travailleur"}>
    <div className="visual-glow" aria-hidden="true" /><div className="visual-city" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <div className="visual-heading"><p><span /> {recruiter ? "RECRUTEZ SIMPLEMENT" : "DES MISSIONS PRÈS DE VOUS"}</p><h2>{recruiter ? <>Le bon talent.<br /><em>Au bon moment.</em></> : <>Votre prochaine mission<br /><em>commence ici.</em></>}</h2></div>
    <div className="visual-character" key={recruiter ? "recruiter" : "worker"}><Image src={recruiter ? "/images/recruiter-illustration.png" : "/images/worker-illustration.png"} alt={recruiter ? "Recruteur consultant des candidatures sur son ordinateur" : "Travailleur consultant des missions sur son téléphone"} fill sizes="(max-width: 900px) 0px, 50vw" priority /></div>
    {recruiter ? <div className="recruiter-previews" key="recruiter-cards"><article className="visual-card publish-card"><span className="visual-card-icon">＋</span><span><small>ESPACE RECRUTEUR</small><strong>Publier une mission</strong></span><b>↗</b></article><article className="visual-card candidate-card"><small>2 nouveaux profils</small><div><span>AM</span><span>SB</span><strong>Candidats disponibles</strong></div></article></div> : variant === "login" ? <div className="worker-previews" key="login-cards"><MissionCard icon="♨" title="Serveur événementiel" city="La Marsa" pay="50 DT" className="card-a"/><MissionCard icon="▣" title="Vendeur en boutique" city="Tunis" pay="40 DT" className="card-b"/><MissionCard icon="▤" title="Assistant administratif" city="Ariana" pay="45 DT" className="card-c"/></div> : <div className="worker-previews single" key="worker-card"><MissionCard icon="✦" title="Mission disponible" city="Près de chez vous" pay="↗" /></div>}
    <p className="visual-footnote">QUICKJOB · DES OPPORTUNITÉS À VOTRE RYTHME</p>
  </aside>;
}

export default function AuthShell({ children, variant = "login" }: { children: React.ReactNode; variant?: "login" | "register" }) {
  const [role, setRole] = useState<Role>("TRAVAILLEUR");
  useEffect(() => {
    const update = (event: Event) => setRole((event as CustomEvent<Role>).detail);
    window.addEventListener("quickjob:role", update);
    return () => window.removeEventListener("quickjob:role", update);
  }, []);
  return <main className="auth-page"><section className="auth-panel"><header className="auth-header"><Link href="/" className="auth-brand" aria-label="QuickJob, accueil"><QuickJobLogo priority /></Link><Link href="/" className="auth-home">Retour à l’accueil ↗</Link></header><div className="auth-content">{children}</div><footer className="auth-footer">À votre rythme. Avec les bonnes personnes.<span>© {new Date().getFullYear()} QuickJob</span></footer></section><AuthVisual variant={variant} role={role} /></main>;
}
