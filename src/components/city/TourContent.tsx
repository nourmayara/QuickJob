import Link from "next/link";
import Icon from "@/components/recruiter/Icon";
import { authHref, journeyAction, type Journey } from "@/lib/journey";
import { journeySteps } from "./hybrid";

export default function TourContent({ journey, step, role, onExplore }: { journey: Journey; step: number; role: string | null; onExplore: () => void }) {
  const content = journeySteps[journey][step];
  const action = journeyAction(journey, role);
  return <div className="city-content" id="city-tour-copy" tabIndex={-1}>
    <div className="city-copy-inner" key={journey + step}>
      <p className="city-eyebrow"><span /> {journey === "travailleur" ? "VOTRE TEMPS. VOS OPPORTUNITÉS." : "VOTRE MISSION. VOTRE ÉQUIPE."}</p>
      <h1 id="city-heading">{content.title}<br /><em>{content.accent}</em></h1>
      <p className="city-description">{content.description}</p>
      <div className="city-context"><span><Icon name={content.icon} size={18} /></span><p>{content.detail}</p></div>
      <div className="city-actions">
        <Link className="city-primary" id="city-main-action" href={action.href}>{action.label}<Icon name="arrow" size={18} /></Link>
        <button className="city-secondary" type="button" onClick={onExplore}><Icon name="grid" size={17} /> Explorer la ville</button>
      </div>
      <p className="city-action-note">{action.note} {!role && <Link href={authHref("login", journey)}>Déjà inscrit ? Se connecter</Link>}</p>
    </div>
  </div>;
}
