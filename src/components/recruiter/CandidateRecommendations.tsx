import Link from "next/link";
import { Avatar, Badge } from "./ui";
import type { ApplicantRecommendation } from "@/lib/matching-service";

type Candidate = {
  id: number;
  firstName: string;
  name: string;
  city: string | null;
  status: string;
  recommendation: ApplicantRecommendation;
};

export default function CandidateRecommendations({ candidates }: { candidates: Candidate[] }) {
  if (!candidates.length) return null;
  return <section className="rq-ai-candidates" aria-label="Candidats recommandés par l’IA">
    <div className="rq-ai-candidates-heading"><div><span>CLASSEMENT EXPLICABLE</span><h3>Candidats recommandés par l’IA</h3><p>Aide à la lecture fondée uniquement sur les critères professionnels de la mission. La décision reste au recruteur.</p></div></div>
    <div className="rq-ai-candidate-grid">{candidates.slice(0, 3).map(candidate => <article className="rq-ai-candidate" key={candidate.id}>
      <div className="rq-ai-candidate-top"><div className="rq-person"><Avatar name={`${candidate.firstName} ${candidate.name}`} /><div><strong>{candidate.firstName} {candidate.name}</strong><small>{candidate.city || "Ville non renseignée"}</small></div></div><span className="rq-ai-score"><strong>{candidate.recommendation.match.score}%</strong><small>compatibilité</small></span></div>
      <div className="rq-ai-strengths"><strong>Points forts</strong><ul>{candidate.recommendation.strengths.slice(0, 3).map(item => <li key={item}>{item}</li>)}</ul></div>
      <div className={`rq-ai-missing ${candidate.recommendation.missingSkills.length ? "has-gaps" : ""}`}><strong>Compétences manquantes</strong><p>{candidate.recommendation.missingSkills.length ? candidate.recommendation.missingSkills.join(", ") : "Aucune compétence demandée identifiée comme manquante."}</p></div>
      <details className="rq-ai-explanation"><summary>Comprendre le score</summary><ul>{Object.entries(candidate.recommendation.match.criteria).filter(([, criterion]) => criterion.weight > 0).map(([key, criterion]) => <li key={key}><span>{criterion.explanation}</span><strong>{criterion.score}/100</strong></li>)}</ul></details>
      <div className="rq-ai-candidate-actions"><Badge status={candidate.status} application /><Link className="rq-button" href={`/recruteur/candidatures/${candidate.id}`}>Consulter et décider</Link></div>
    </article>)}</div>
  </section>;
}
