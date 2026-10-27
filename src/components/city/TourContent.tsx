import Link from "next/link";
import { authHref } from "@/lib/journey";
import MissionCard from "./MissionCard";
import { chapters, cityMissions, workerSteps, type CityMission } from "./data";

export default function TourContent({ chapter, missionIndex, onSelect, goTo }: {
 chapter: number; missionIndex: number; onSelect: (mission: CityMission) => void; goTo: (progress: number) => void;
}) {
 const worker = chapter===1 || chapter===2;
 return <div id="city-tour-copy" tabIndex={-1} aria-label={chapters[chapter].scene} className={`city-content chapter-${chapter}`}>
  <div className="city-chapter-copy" key={chapter}>
   {chapter===0 ? <h1>Trouvez une mission.<br /><em>Ou trouvez le bon renfort.</em></h1> : <h2>{chapters[chapter].title}</h2>}
   <p className="city-description">{chapters[chapter].description}</p>
   {chapter===1 && <><p className="city-worker-note">Une mission vous intéresse ? Ouvrez sa fiche pour découvrir le lieu, les horaires et la rémunération.</p><nav className="city-mission-picker" aria-label="Choisir un lieu de mission">{cityMissions.slice(0,3).map((mission,i) => <button key={mission.id} aria-pressed={missionIndex===i} onClick={() => goTo([.265,.33,.395][i])}>{mission.category}</button>)}</nav></>}
   {chapter===2 && <>
    <div className="city-application-story" aria-label="Illustration du trajet d’une candidature"><span>Vous</span><b aria-hidden="true">→</b><span>Votre candidature</span><b aria-hidden="true">→</b><span>Le recruteur</span></div>
    <ol className="city-steps">{workerSteps.map((step,i) => <li key={step}><span>0{i+1}</span>{step}</li>)}</ol>
   </>}
   {chapter===1 && <MissionCard mission={cityMissions[missionIndex]} onSelect={onSelect} />}
   <div className="city-actions">
    {chapter===3 ? <><Link className="city-primary" href={authHref("register", "recruteur")}>Publier ma mission <span aria-hidden="true">↗</span></Link><Link className="city-secondary" href={authHref("register", "travailleur")}>Je cherche une mission</Link></> : <><button className="city-primary" onClick={() => goTo(.265)}>{worker ? "Explorer les missions" : "Trouver une mission"}<span aria-hidden="true">↗</span></button><Link className="city-secondary city-recruit-cta" href={authHref("register", "recruteur")}>Publier une mission <span aria-hidden="true">↗</span></Link></>}
   </div>
   {chapter===0 && <button className="city-recruit-preview" onClick={() => goTo(.62)}>Découvrir le parcours recruteur <span aria-hidden="true">→</span></button>}
   {chapter===4 && <Link className="city-all-missions" href="/register">Rejoindre QuickJob ↗</Link>}
  </div>
 </div>;
}
