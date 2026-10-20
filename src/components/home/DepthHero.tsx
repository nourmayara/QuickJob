"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
type Preview = { title: string; city: string; pay: number; duration: string; color: string; icon: string };
export default function DepthHero({ missions, onSelect }: { missions: Preview[]; onSelect: (index: number) => void }) {
 const section = useRef<HTMLElement>(null);
 useEffect(() => {
  const element = section.current;
  if (!element) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const render = () => {
   frame = 0;
   const rect = element.getBoundingClientRect();
   const distance = Math.max(1, rect.height - window.innerHeight + 80);
   const p = reduced.matches ? 0 : Math.min(1, Math.max(0, (80 - rect.top) / distance));
   element.style.setProperty("--progress", String(p));
   element.style.setProperty("--yaw", `${-23 + p * 52 + pointerX * 5}deg`);
   element.style.setProperty("--pitch", `${8 + pointerY * 5 - p * 15}deg`);
   element.style.setProperty("--zoom", String(1 + p * .55));
   element.style.setProperty("--first", String(Math.max(0, 1 - p * 2.5)));
   element.style.setProperty("--second", String(Math.max(0, Math.min(1, (p - .47) * 3.5))));
   element.style.setProperty("--lift", `${p * -90}px`);
   element.style.setProperty("--card-turn", `${p * -22}deg`);
   element.style.setProperty("--pointer-x", `${pointerX * 14}px`);
   element.style.setProperty("--pointer-y", `${pointerY * 10}px`);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
  const move = (e: PointerEvent) => { if (e.pointerType !== "mouse" || reduced.matches) return; pointerX = e.clientX / window.innerWidth - .5; pointerY = e.clientY / window.innerHeight - .5; schedule(); };
  const reset = () => { pointerX = 0; pointerY = 0; schedule(); };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  reduced.addEventListener("change", schedule);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerleave", reset);
  render();
  return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); reduced.removeEventListener("change", schedule); element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", reset); };
 }, []);
 return <section id="accueil" className="depth-story" ref={section} aria-label="Votre prochaine opportunité commence ici">
  <div className="depth-sticky">
   <div className="depth-grain" aria-hidden="true" />
   <div className="depth-top"><span><i /> QUICKJOB — LE TRAVAIL EN MOUVEMENT</span><span>TUNISIE / VOTRE PROCHAIN CHAPITRE</span></div>
   <div className="depth-headline"><p>UNE RENCONTRE PEUT TOUT CHANGER.</p><h1>Votre prochaine<br /><em>opportunité</em><br />commence ici<span>.</span></h1></div>
   <div className="depth-chapter" aria-hidden="true"><span>LES POSSIBILITÉS PRENNENT VIE.</span><p>Le bon talent.<br /><em>Au bon moment.</em></p></div>
   <div className="depth-space" aria-hidden="true"><div className="depth-floor" /><div className="portal-rig"><div className="portal-body">{Array.from({ length: 22 }, (_, i) => <div className="portal-ring" key={i} style={{ transform: `translateZ(${-i * 7}px)`, opacity: 1 - i * .026 }} />)}<div className="portal-face"><Image src="/images/people.jpg" alt="" fill priority sizes="(max-width: 600px) 80vw, 45vw" /><span className="portal-tint" /><span className="portal-word">q<span>↗</span></span><span className="portal-caption">OPEN TO POSSIBILITIES.</span></div></div><div className="portal-orbit orbit-a" /><div className="portal-orbit orbit-b" /></div><div className="depth-sphere sphere-one" /><div className="depth-sphere sphere-two" /><div className="depth-spark">✳</div></div>
   <div className="depth-missions">{missions.map((m,i) => <button key={m.title} className={`depth-mission depth-mission-${i}`} onClick={() => onSelect(i)}><span className={`job-symbol ${m.color}`} aria-hidden="true">{m.icon}</span><span><small>MISSION / 0{i+1}</small><strong>{m.title}</strong><span className="depth-city">{m.city} · {m.duration}</span></span><b>{m.pay}<small> DT</small></b><span className="depth-card-arrow" aria-hidden="true">↗</span></button>)}</div>
   <div className="depth-copy"><p>Trouvez des missions ponctuelles près de chez vous ou recrutez les bons profils en quelques clics.</p><div><a className="qj-btn white" href="#missions">Explorer les missions <span aria-hidden="true">↗</span></a><Link className="depth-publish" href="/register">Publier une mission ↗</Link></div></div>
   <div className="depth-bottom"><a href="#introduction"><span>↓</span> SCROLLEZ. CHANGEZ DE PERSPECTIVE.</a><div className="depth-progress" aria-hidden="true"><i /></div><span>EXEMPLES DE MISSIONS FICTIVES</span></div>
  </div>
 </section>;
}
