"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import QuickJobLogo from "@/components/QuickJobLogo";
import Icon from "@/components/recruiter/Icon";
import { authHref, type Journey } from "@/lib/journey";
import CityFallback from "./CityFallback";
import CityNavigation from "./CityNavigation";
import TourContent from "./TourContent";
import JourneyRail from "./JourneyRail";
import { cityPlaces, cityView, journeySteps } from "./hybrid";
import type { TourState } from "./data";

const CityCanvas = dynamic(() => import("./CityCanvas"), { ssr: false, loading: () => <CityFallback /> });

// This boundary must be outside the dynamic component to catch chunk-load failures.
class CityLoadBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? <CityFallback /> : this.props.children; }
}

export default function CityExperience({ role = null }: { role?: string | null }) {
  const [journey, setJourney] = useState<Journey>(role === "RECRUTEUR" ? "recruteur" : "travailleur");
  const [steps, setSteps] = useState({ travailleur: 0, recruteur: 0 });
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [overview, setOverview] = useState(false);
  const [environment, setEnvironment] = useState({ desktop: false, reduced: false });
  const [supported, setSupported] = useState<boolean | null>(null);
  const [simple, setSimple] = useState(false);
  const [requested3D, setRequested3D] = useState(false);
  const [ready, setReady] = useState(false);
  const tour = useRef<TourState>({ progress: 0, invalidate: null });
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const experience = useRef<HTMLElement>(null);
  const step = steps[journey];
  const allow3D = (environment.desktop || requested3D) && !environment.reduced && !simple;
  const interactive = allow3D && supported === true;
  const view = useMemo(() => cityView(journey, step, placeId, overview), [journey, step, placeId, overview]);
  const selectedPlace = cityPlaces.find(place => place.id === placeId);
  const visiblePlaces = new Set(overview ? cityPlaces.map(place => place.id) : [...(journey === "travailleur" ? ["restaurant", "boutique", "event"] : ["restaurant", "warehouse", "workspace"]), ...(placeId ? [placeId] : [])]);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => { setSupported(false); setReady(false); }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnvironment({ desktop: desktop.matches, reduced: reduced.matches });
    const frame = requestAnimationFrame(update);
    desktop.addEventListener("change", update); reduced.addEventListener("change", update);
    return () => { cancelAnimationFrame(frame); desktop.removeEventListener("change", update); reduced.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    if (!allow3D || supported !== null) return;
    const frame = requestAnimationFrame(() => {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2");
        setSupported(Boolean(gl));
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch { setSupported(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, [allow3D, supported]);

  function chooseJourney(next: Journey) { setJourney(next); setPlaceId(null); setOverview(false); }
  function goStep(next: number) {
    setSteps(current => ({ ...current, [journey]: Math.max(0, Math.min(2, next)) })); setPlaceId(null); setOverview(false);
    if (window.matchMedia("(max-width: 700px)").matches) requestAnimationFrame(() => {
      const copy = document.getElementById("city-tour-copy");
      copy?.focus({ preventScroll: true });
      copy?.scrollIntoView({ behavior: environment.reduced ? "instant" : "smooth", block: "start" });
    });
  }
  function selectPlace(id: string) {
    setPlaceId(id); setOverview(false);
    setSteps(current => ({ ...current, [journey]: id === "workspace" ? journey === "recruteur" ? 1 : 2 : 0 }));
  }
  function explore() {
    setOverview(true);
    requestAnimationFrame(() => {
      const visual = experience.current?.querySelector<HTMLElement>(".city-visual");
      if (!visual) return;
      const bounds = visual.getBoundingClientRect();
      if (window.matchMedia("(max-width: 700px)").matches) {
        visual.querySelector<HTMLButtonElement>(".city-poi:not([hidden])")?.focus({ preventScroll: true });
        visual.scrollIntoView({ behavior: environment.reduced ? "instant" : "smooth", block: "start" });
      } else if (bounds.top < 0 || bounds.bottom > window.innerHeight + 40) {
        visual.scrollIntoView({ behavior: environment.reduced ? "instant" : "smooth", block: "center" });
      }
    });
  }
  function toggleRenderer() { setReady(false); if (interactive) { setSimple(true); setRequested3D(false); } else { setSimple(false); setRequested3D(true); } }

  return <div className="city-home" id="accueil" data-journey={journey} data-step={step} data-overview={overview}>
    <a className="city-skip" href="#city-main-action">Aller à l’action principale</a>
    <CityNavigation journey={journey} role={role} onExplore={explore} />
    <main>
      <section className="city-experience" id="experience" ref={experience} aria-labelledby="city-heading">
        <div className="city-intro-line"><span><i /> QUICKJOB CITY</span><p>Des missions ponctuelles. Des rencontres utiles. <span>En Tunisie.</span></p></div>
        <div className="city-intent" role="group" aria-label="Choisissez votre parcours">
          <span>Vous êtes ici pour…</span>
          <div><button type="button" aria-pressed={journey === "travailleur"} onClick={() => chooseJourney("travailleur")}><Icon name="search" size={17} /> Je cherche une mission</button><button type="button" aria-pressed={journey === "recruteur"} onClick={() => chooseJourney("recruteur")}><Icon name="people" size={18} /> Je veux recruter</button></div>
        </div>
        <div className="city-main-grid">
          <TourContent journey={journey} step={step} role={role} onExplore={explore} />
          <div className="city-visual">
            <div className="city-scene-top"><span><Icon name="pin" size={14} /> Un lieu, une possibilité.</span><button type="button" onClick={() => { setOverview(!overview); setPlaceId(null); }} aria-pressed={overview}><Icon name="grid" size={15} /> Vue d’ensemble</button></div>
            <div className="city-scene" data-renderer={interactive && ready ? "webgl" : "illustration"} aria-label="Explorer les secteurs de QuickJob City">
              <div className="city-render">{interactive ? <CityLoadBoundary onFailure={onFailure}><CityCanvas tour={tour} mobile={!environment.desktop} view={view} onReady={onReady} onFailure={onFailure} labels={labels} /></CityLoadBoundary> : <CityFallback activePlace={placeId} />}</div>
              <div className="city-places" role="group" aria-label="Secteurs à explorer">{cityPlaces.map((place, index) => <button
                key={place.id} ref={element => { labels.current[index] = element; }} type="button" className="city-poi" data-place={place.id}
                hidden={!visiblePlaces.has(place.id)} aria-pressed={placeId === place.id} aria-label={`Explorer le secteur ${place.label}`}
                onClick={() => selectPlace(place.id)}><span><Icon name={place.icon} size={17} /></span><strong>{place.label}</strong><Icon name="arrow" size={13} />
              </button>)}</div>
            </div>
            <div className="city-scene-caption">
              <div><span className="city-location-mark" aria-hidden="true" /><p><strong>{selectedPlace ? selectedPlace.label : "La ville est à vous."}</strong><span>{selectedPlace ? selectedPlace.description : "Choisissez un lieu ou une étape du parcours."}</span></p></div>
              {!environment.reduced && supported !== false && <button type="button" className="city-render-toggle" onClick={toggleRenderer}>{interactive ? "Vue illustrée" : "Activer la 3D"}</button>}
              {(environment.reduced || supported === false) && <span className="city-render-note">Vue illustrée</span>}
            </div>
            <p className="city-scene-note">La ville présente les secteurs. Les missions réelles sont dans votre espace.</p>
          </div>
        </div>
        <JourneyRail journey={journey} step={step} onStep={goStep} />
        <p className="city-access-note"><Icon name="shield" size={15} /> Votre parcours, votre choix. Vous pouvez commencer à tout moment.</p>
        <p className="city-announcement" role="status" aria-live="polite" aria-atomic="true">{`Parcours ${journey}. Étape ${step + 1} sur 3 : ${journeySteps[journey][step].label}.`}</p>
      </section>
    </main>
    <footer className="city-footer"><a href="#accueil" className="city-brand" aria-label="QuickJob, retour à l’accueil"><QuickJobLogo /></a><p>L’utilisateur choisit sa destination.<br />QuickJob City lui montre le chemin.</p><nav aria-label="Pied de page"><Link href="/conditions">Conditions</Link><Link href="/confidentialite">Confidentialité</Link>{!role && <Link href={authHref("login", journey)}>Connexion</Link>}</nav><small>© {new Date().getFullYear()} QuickJob</small></footer>
  </div>;
}
