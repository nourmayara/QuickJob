"use client";
import Icon from "@/components/recruiter/Icon";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import CityFallback from "./CityFallback";
import CityPoster from "./CityPoster";
import CityNavigation from "./CityNavigation";
import TourContent from "./TourContent";
import RecruiterDemo from "./RecruiterDemo";
import { MissionCardContent } from "./MissionCard";
import QuickJobLogo from "@/components/QuickJobLogo";
import { journeyStages, cityMissions, demoCandidates, getRecruitMoment, type CityMission, type DemoCandidate, type TourState } from "./data";

const CityCanvas = dynamic(() => import("./CityCanvas"), { ssr: false, loading: () => null });
export default function CityExperience() {
 const root = useRef<HTMLDivElement>(null);
 const stage = useRef<HTMLElement>(null);
 const tour = useRef<TourState>({ progress: 0, invalidate: null });
 const labels = useRef<(HTMLButtonElement | null)[]>([]);
 const controller = useRef<ScrollTriggerType | null>(null);
 const chapterRef = useRef(0);
 const snapshot = useRef({ mission: 0, recruit: 0 });
 const [chapter, setChapter] = useState(0);
 const [missionIndex, setMissionIndex] = useState(0);
 const [recruitMoment, setRecruitMoment] = useState(0);
 const [profile, setProfile] = useState<DemoCandidate | null>(null);
 const [selectedCandidate, setSelectedCandidate] = useState(demoCandidates[0]);
 const skipRequested = useRef(false);
 const [capable, setCapable] = useState<boolean | null>(null);
 const [mobile, setMobile] = useState(false);
 const [reduced, setReduced] = useState(false);
 const [simplified, setSimplified] = useState(false);
 const [ready, setReady] = useState(false);
 const [selected, setSelected] = useState<CityMission | null>(null);
 const dialog = useRef<HTMLDialogElement>(null);
 const profileDialog = useRef<HTMLDialogElement>(null);
 const interactive = capable === true && !simplified;
 const animated = interactive && !reduced;
 const onReady = useCallback(() => setReady(true), []);
 const onFailure = useCallback(() => { setCapable(false); setReady(false); }, []);
 const onSelect = useCallback((mission: CityMission) => setSelected(mission), []);

 useEffect(() => {
  const narrow = window.matchMedia("(max-width: 700px)");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const update = () => { setMobile(narrow.matches); setReduced(motion.matches); };
  narrow.addEventListener("change", update); motion.addEventListener("change", update);
  const frame = requestAnimationFrame(() => {
  update();
  try {
   const test = document.createElement("canvas");
   const gl = test.getContext("webgl2");
   setCapable(Boolean(gl)); gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { setCapable(false); }
  });
  return () => { cancelAnimationFrame(frame); narrow.removeEventListener("change", update); motion.removeEventListener("change", update); };
 }, []);

 const displayProgress = useCallback(() => {
  const p = tour.current.progress;
  const next = Math.min(4, Math.floor((p + .00001) * 5));
  if (next !== chapterRef.current) { chapterRef.current = next; setChapter(next); }
  const mission = p < .3 ? 0 : p < .365 ? 1 : 2;
  const recruit = getRecruitMoment(p);
  if (mission !== snapshot.current.mission) { snapshot.current.mission = mission; setMissionIndex(mission); }
  if (recruit !== snapshot.current.recruit) { snapshot.current.recruit = recruit; setRecruitMoment(recruit); }
  root.current?.style.setProperty("--city-progress", String(p));
  root.current?.style.setProperty("--recruit-progress", String(Math.min(1,Math.max(0,(p-.6)/.2))));
  tour.current.invalidate?.();
 }, []);

 useEffect(() => {
  if (!animated || !stage.current) return;
  let disposed = false;
  let context: { revert: () => void } | undefined;
  let refreshFrame = 0;
  (async () => {
   const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
   if (disposed || !stage.current) return;
   gsap.registerPlugin(ScrollTrigger);
   context = gsap.context(() => {
    const timeline = gsap.timeline({ scrollTrigger: {
     id: "quickjob-city", trigger: stage.current, start: "top top",
     end: () => `+=${Math.round(window.innerHeight * (mobile ? 4.5 : 6.5))}`,
     pin: true, pinSpacing: true, scrub: mobile ? .35 : .65,
     anticipatePin: 1, invalidateOnRefresh: true,
    }});
    timeline.fromTo(tour.current, { progress: 0 }, { progress: 1, duration: 1, ease: "none", onUpdate: displayProgress });
    controller.current = timeline.scrollTrigger ?? null;
   }, root);
   refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
  })().catch(() => { if (!disposed) setSimplified(true); });
  return () => { disposed = true; cancelAnimationFrame(refreshFrame); context?.revert(); controller.current = null; };
 }, [animated, mobile, displayProgress]);

 useEffect(() => {
  if (!selected && !profile) return;
  if (selected) dialog.current?.showModal();
  if (profile) profileDialog.current?.showModal();
  const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = previous; };
 }, [selected, profile]);

 useEffect(() => {
  if (chapter===1 && skipRequested.current) {
   skipRequested.current = false;
   document.getElementById("city-tour-copy")?.focus({ preventScroll: true });
  }
 }, [chapter]);

 const goTo = useCallback((p: number) => {
  const trigger = controller.current;
  if (animated && trigger) {
   window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * p, behavior: "smooth" });
  } else {
   tour.current.progress = p; displayProgress();
   stage.current?.scrollIntoView({ behavior: "auto" });
  }
 }, [animated, displayProgress]);

 return <div className={`city-home ${chapter===2 ? "is-cinematic" : ""}`} data-chapter={chapter} data-recruit-moment={recruitMoment} ref={root}>
  <a className="city-skip" href="#city-tour-copy" onClick={e => { e.preventDefault(); skipRequested.current = chapter!==1; goTo(.265); if (chapter===1) document.getElementById("city-tour-copy")?.focus({ preventScroll: true }); }}>Consulter les missions</a>
  <CityNavigation goTo={goTo} />
  <main>
   <section id="accueil" ref={stage} className={`city-tour ${animated ? "is-animated" : "is-static"}`} aria-label="Voyage dans QuickJob City">
    <div className="city-canvas-layer" aria-busy={capable === null || (interactive && !ready)} data-ready={interactive && ready}>
     {simplified ? <CityFallback /> : !(interactive && ready) && <CityPoster />}
     {interactive && <div className="city-live-render" data-ready={ready}><CityCanvas tour={tour} mobile={mobile} onReady={onReady} onFailure={onFailure} labels={labels} /></div>}
    </div>
    {interactive && <div className="city-projected-labels">{cityMissions.slice(0,3).map((mission,i) => <button ref={element => { labels.current[i] = element; }} key={mission.id} className="city-world-label" style={{ display: "none" }} onClick={() => onSelect(mission)} aria-label={`Voir la mission : ${mission.title}, ${mission.city}`}><MissionCardContent mission={mission} /></button>)}</div>}
    <div className="city-vignette" aria-hidden="true" />
    <div className="city-scene-top"><span><i /> QUICKJOB CITY</span><span>TUNISIE · UN MONDE DE POSSIBILITÉS</span></div>
    <TourContent chapter={chapter} missionIndex={missionIndex} onSelect={onSelect} goTo={goTo} />
    {chapter===3 && <RecruiterDemo moment={recruitMoment} goTo={goTo} onProfile={setProfile} selectedCandidate={selectedCandidate} />}
    <div className="city-scene-status">{capable && <button onClick={() => { setReady(false); setSimplified(v => !v); }}>{simplified ? "Activer la 3D" : "Vue simplifiée"}</button>}</div>
    <nav className="city-chapter-nav" aria-label="Les quatre étapes du voyage">{journeyStages.map((c,i) => <button key={c.label} style={{ "--stage-start": c.start, "--stage-span": c.end-c.start } as CSSProperties} aria-current={(chapter===0 ? 0 : chapter<3 ? 1 : chapter-1)===i ? "step" : undefined} aria-label={`Étape ${i+1} sur 4 : ${c.label}`} onClick={() => goTo(c.destination)}><span>0{i+1}</span><strong>{c.label}</strong><i /><div className="city-step-progress" aria-hidden="true" /></button>)}</nav>
   </section>

  </main>
  <footer className="city-footer"><a className="city-brand" href="#accueil" aria-label="QuickJob, retour à l’accueil" onClick={e => { e.preventDefault(); goTo(0); }}><QuickJobLogo /></a><p>Les bons talents. Les bonnes missions. Le bon moment.</p><nav aria-label="Pied de page"><Link href="/login">Connexion</Link><Link href="/register">Inscription</Link><a href="#accueil" onClick={e => { e.preventDefault(); goTo(.27); }}>Missions</a></nav><small>© {new Date().getFullYear()} QuickJob.</small></footer>
  <dialog ref={dialog} className="city-dialog" aria-labelledby="city-mission-title" onClose={() => setSelected(null)} onClick={e => { if (e.target===e.currentTarget) dialog.current?.close(); }}>{selected && <><button autoFocus className="city-dialog-close" aria-label="Fermer les détails" onClick={() => dialog.current?.close()}><Icon name="close" size={19} /></button><p className="city-eyebrow">EXEMPLE FICTIF · {selected.category}</p><h2 id="city-mission-title">{selected.title}</h2><p>{selected.description}</p><dl><div><dt>Lieu</dt><dd>{selected.city}</dd></div><div><dt>Date</dt><dd>{selected.date}</dd></div><div><dt>Durée</dt><dd>{selected.duration}</dd></div><div><dt>Rémunération</dt><dd>{selected.pay} DT</dd></div></dl><p className="city-dialog-note">Cette mission est une démonstration. Aucune candidature réelle n’est ouverte sur cet aperçu.</p><Link className="city-primary" href="/register">Créer mon profil <Icon name="arrow" size={18} /></Link></>}</dialog>
  <dialog ref={profileDialog} className="city-dialog" aria-labelledby="city-profile-title" onClose={() => setProfile(null)} onClick={e => { if (e.target===e.currentTarget) profileDialog.current?.close(); }}>{profile && <><button autoFocus className="city-dialog-close" aria-label="Fermer le profil" onClick={() => profileDialog.current?.close()}><Icon name="close" size={19} /></button><p className="city-eyebrow">PROFIL FICTIF · DÉMONSTRATION</p><h2 id="city-profile-title">{profile.name}</h2><p>{profile.experience}</p><dl><div><dt>Compétences</dt><dd>{profile.skills}</dd></div><div><dt>Note fictive</dt><dd>{profile.rating} / 5</dd></div></dl><p className="city-dialog-note">Ce profil illustre la réception d’une candidature. Aucune personne réelle n’est contactée.</p><button className="city-primary" onClick={() => { setSelectedCandidate(profile); profileDialog.current?.close(); goTo(.765); }}>Simuler la sélection <Icon name="check" size={18} /></button></>}</dialog>
 </div>;
}
