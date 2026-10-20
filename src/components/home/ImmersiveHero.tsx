"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
type Preview = {
    title: string;
    city: string;
    pay: number;
    duration: string;
    color: string;
    icon: string;
};
export default function ImmersiveHero({ missions, onSelect }: {
    missions: Preview[];
    onSelect: (index: number) => void;
}) {
    const scene = useRef<HTMLElement>(null);
    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;
        const update = () => { frame = 0; if (!scene.current || reduce.matches)
            return; const rect = scene.current.getBoundingClientRect(); scene.current.style.setProperty("--scroll", String(Math.min(1, Math.max(0, -rect.top / rect.height)))); };
        const scroll = () => { if (!frame)
            frame = requestAnimationFrame(update); };
        window.addEventListener("scroll", scroll, { passive: true });
        update();
        return () => { window.removeEventListener("scroll", scroll); cancelAnimationFrame(frame); };
    }, []);
    return <section id="accueil" className="immersive-hero" ref={scene}>
  <div className="hero-grain" aria-hidden="true"/>
  <div className="scene-top"><span><i /> LE TRAVAIL, À VOTRE RYTHME.</span><span>TUNISIE · DE NOUVELLES POSSIBILITÉS</span></div>
  <div className="scene-photo"><Image src="/images/people.jpg" alt="Des professionnels réunis autour d’un projet dans un espace de travail" fill priority sizes="(max-width: 650px) 85vw, 48vw"/><div className="scene-photo-shade"/></div>
  <span className="scene-outline" aria-hidden="true"/>
  <div className="scene-title"><span className="hero-kicker">CHAQUE RENCONTRE OUVRE UNE PORTE.</span><h1><span>Votre prochaine</span><em>opportunité</em><span className="last-line">commence ici<span className="hero-period">.</span></span></h1></div>
  <div className="scene-copy"><p>Trouvez des missions ponctuelles près de chez vous ou recrutez les bons profils en quelques clics.</p><div className="scene-actions"><a className="qj-btn white" href="#missions">Explorer les missions <span aria-hidden="true">↗</span></a><Link className="hero-secondary" href="/register">Publier une mission <span aria-hidden="true">↗</span></Link></div></div>
  <span className="scene-seal" aria-hidden="true"><span>VOTRE TEMPS</span><b>✳</b><span>A DE LA VALEUR</span></span>
  <div className="scene-jobs">{missions.map((m, i) => <button className={`scene-job scene-job-${i}`} key={m.title} onClick={() => onSelect(i)}><span className={`job-symbol ${m.color}`} aria-hidden="true">{m.icon}</span><span><strong>{m.title}</strong><small>{m.city} · {m.duration}</small></span><b>{m.pay}<small> DT</small></b><span className="scene-job-arrow" aria-hidden="true">↗</span></button>)}</div>
  <div className="scene-bottom"><a href="#introduction"><span className="scroll-circle">↓</span> FAITES DÉFILER. TOUT COMMENCE LÀ.</a><span>LES MISSIONS PRÉSENTÉES SONT DES EXEMPLES FICTIFS.</span></div>
 </section>;
}
