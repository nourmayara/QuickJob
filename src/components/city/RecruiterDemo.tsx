"use client";
import type { CSSProperties } from "react";
import { demoCandidates, type DemoCandidate } from "./data";

const steps = ["Publication", "Candidatures", "Sélection"];
const destinations = [.62, .7, .765];

export default function RecruiterDemo({ moment, goTo, onProfile, selectedCandidate }: {
 moment: number;
 goTo: (progress: number) => void;
 onProfile: (candidate: DemoCandidate) => void;
 selectedCandidate: DemoCandidate;
}) {
 const step = moment < 2 ? 0 : moment === 2 ? 1 : 2;
 return <aside id="city-recruit-preview" className="city-recruit-demo" aria-label="Démonstration du parcours recruteur">
  <div className="recruit-demo-heading"><span className="recruit-demo-mark" aria-hidden="true">q↗</span><strong>Votre espace recruteur</strong><small>Démonstration</small></div>
  <nav className="recruit-stepper" aria-label="Étapes de la démonstration">{steps.map((label, i) => <button key={label} aria-current={step===i ? "step" : undefined} onClick={() => goTo(destinations[i])}><span>{i+1}</span>{label}</button>)}</nav>
  <div className="recruit-panel" key={step}>
   {step===0 && <>
    <p className="recruit-panel-title">Un besoin précis. Une mission claire.</p>
    <dl className="recruit-field-grid">
     <div className="recruit-field recruit-field-wide"><dt>Titre de la mission</dt><dd>Serveur événementiel</dd></div>
     <div className="recruit-field"><dt>Lieu</dt><dd>La Marsa</dd></div>
     <div className="recruit-field"><dt>Date</dt><dd>17 octobre 2026</dd></div>
     <div className="recruit-field"><dt>Horaires</dt><dd>18:00 – 23:00</dd></div>
     <div className="recruit-field"><dt>Rémunération</dt><dd>50 DT / personne</dd></div>
     <div className="recruit-field recruit-field-wide"><dt>Travailleurs recherchés</dt><dd>3 personnes</dd></div>
    </dl>
   </>}
   {step===1 && <>
    <p className="recruit-panel-title">Les bons profils arrivent à vous.</p>
    <p className="recruit-panel-subtitle">Serveur événementiel · 3 candidatures d’exemple</p>
    <div className="recruit-candidate-list">{demoCandidates.map((candidate,i) => <article className="recruit-candidate" key={candidate.id} style={{ "--candidate-order": i } as CSSProperties}>
     <span className="recruit-avatar" aria-hidden="true">{candidate.initials}</span>
     <div><strong>{candidate.name}</strong><small>{candidate.skills}</small><span className="recruit-rating"><span aria-hidden="true">★</span> {candidate.rating}/5 <small>· note fictive</small></span></div>
     <button className="recruit-profile-button" aria-label={`Voir le profil d’exemple de ${candidate.name}`} onClick={() => onProfile(candidate)}>Voir le profil <span aria-hidden="true">↗</span></button>
    </article>)}</div>
    <button className="recruit-demo-next" onClick={() => goTo(.765)}>Voir un exemple de sélection →</button>
   </>}
   {step===2 && moment===3 && <div className="recruit-confirmation recruit-selection-preview">
    <p className="recruit-panel-title">À vous de choisir votre renfort.</p>
    <span className="recruit-avatar" aria-hidden="true">{selectedCandidate.initials}</span><strong>{selectedCandidate.name}</strong>
    <p>{selectedCandidate.skills}<br />Disponible le 17 octobre · La Marsa</p>
    <button className="recruit-publish-button" onClick={() => goTo(.765)}>Accepter le candidat <span aria-hidden="true">✓</span></button>
    <span className="recruit-cursor" aria-hidden="true">↖</span>
    <small>Continuez à défiler pour simuler la confirmation.</small>
   </div>}
   {step===2 && moment===4 && <div className="recruit-confirmation">
    <span className="recruit-confirmation-check" aria-hidden="true">✓</span>
    <p className="recruit-panel-title">Travailleur sélectionné</p>
    <span className="recruit-avatar" aria-hidden="true">{selectedCandidate.initials}</span><strong>{selectedCandidate.name}</strong>
    <p>Serveur événementiel · La Marsa<br />17 octobre · 18:00 – 23:00</p>
    <span className="recruit-confirmation-badge">1 profil sélectionné sur 3 recherchés</span>
    <small>Le travailleur reçoit la confirmation de votre sélection.</small>
   </div>}
  </div>
  {step===0 && <div className="recruit-publication-footer">
   <button className={`recruit-publish-button ${moment===1 ? "is-published" : ""}`} onClick={() => goTo(moment===1 ? .7 : .658)}>{moment===1 ? "✓ Mission publiée · candidatures" : "Publier la mission"}<span aria-hidden="true">{moment===1 ? "→" : "↗"}</span></button>
   {moment===0 && <span className="recruit-cursor" aria-hidden="true">↖</span>}
   <p className="recruit-live-status" role="status">{moment===1 ? "Publication simulée. Continuez pour découvrir les candidatures." : "Faites défiler pour voir la publication."}</p>
  </div>}
  <p className="recruit-demo-note">Exemple animé · mission, profils et notes fictifs. Aucune publication réelle.</p>
 </aside>;
}
