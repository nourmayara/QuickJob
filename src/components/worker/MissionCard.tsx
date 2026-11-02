import SoftIcon from "@/components/SoftIcon";
import { categoryIcon } from "@/components/category-icon";
import FavoriteButton from "./FavoriteButton";
import MissionArtwork from "./MissionArtwork";
import QuickApplyButton from "./QuickApplyButton";
import Link from "next/link";
import type { WorkerMission } from "@/lib/worker-data";
import type { MatchResult } from "@/lib/matching-score";
import { Badge, formatDate } from "@/components/recruiter/ui";
import Icon from "@/components/recruiter/Icon";

export default function MissionCard({ mission: m, match }: { mission: WorkerMission; match?: MatchResult }) {
  const reasons = match ? Object.values(match.criteria).filter(item => item.score > 0).sort((a, b) => b.points - a.points) : [];
  return <article className={`wk-mission-card ${match ? "wk-recommended-card" : ""}`}>
    <MissionArtwork category={m.category} />
    <div className="wk-mission-body">
      <div className="wk-card-top"><span className="wk-category"><SoftIcon name={categoryIcon(m.category)} size={17} />{m.category || "Catégorie à préciser"}</span>{match ? <span className="wk-match-score"><strong>{match.score}%</strong> compatible</span> : m.applications[0] && <Badge status={m.applications[0].status} application />}</div>
      <h2><Link href={`/dashboard/travailleur/missions/${m.id}`}>{m.title}</Link></h2>
      <p className="wk-company"><SoftIcon name="store" size={14} />{m.recruiter.companyName || `${m.recruiter.firstName} ${m.recruiter.name}`}</p>
      <p className="wk-excerpt">{m.description}</p>
      <div className="wk-mission-facts"><span><SoftIcon name="pin" size={14} />{m.city || "Ville à préciser"}</span><span><SoftIcon name="calendar" size={14} />{formatDate(m.date)}</span><span><SoftIcon name="clock" size={14} />{m.startTime && m.endTime ? `${m.startTime} – ${m.endTime}` : "Horaires à préciser"}</span><span><SoftIcon name="people" size={14} />{Math.max(0, m.capacity - m._count.applications)} place{m.capacity - m._count.applications > 1 ? "s" : ""} disponible{m.capacity - m._count.applications > 1 ? "s" : ""}</span></div>
      {match && <details className="wk-match-why"><summary>Pourquoi cette mission ?</summary><ul>{reasons.length ? reasons.slice(0, 4).map(reason => <li key={reason.explanation}>{reason.explanation}</li>) : <li>Cette mission respecte vos contraintes obligatoires.</li>}</ul></details>}
      <div className="wk-card-bottom"><div className="wk-card-pay"><SoftIcon name="briefcase" tone="yellow" size={20} /><span><strong>{m.pay === null ? "À préciser" : `${m.pay.toLocaleString("fr-TN")} TND`}</strong><small>Par travailleur · par mission</small></span></div><div className="wk-card-actions"><FavoriteButton missionId={m.id} initialValue={m.favorites.length > 0} />{match ? <><Link href={`/dashboard/travailleur/missions/${m.id}`} className="rq-button">Consulter <Icon name="arrow" size={15} /></Link><QuickApplyButton missionId={m.id} /></> : <Link href={`/dashboard/travailleur/missions/${m.id}`} className="rq-button rq-primary">Voir la mission <Icon name="arrow" size={15} /></Link>}</div></div>
    </div>
  </article>;
}
