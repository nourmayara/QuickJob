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

export default function MissionCard({ mission: m, match, compact = false, dashboard = false }: { mission: WorkerMission; match?: MatchResult; compact?: boolean; dashboard?: boolean }) {
  const reasons = match ? Object.values(match.criteria).filter(item => item.score > 0).sort((a, b) => b.points - a.points) : [];
  const skills = (m.requiredSkills.length ? m.requiredSkills.map(item => item.skill.name) : (m.skills || "").split(/[,;\n•]+/)).map(skill => skill.trim()).filter(Boolean).slice(0, 2);
  if (dashboard) return <article className="wk-dashboard-mission-card">
    <MissionArtwork category={m.category} className="wk-dashboard-mission-art" />
    <div className="wk-dashboard-mission-body">
      <div className="wk-dashboard-mission-heading"><span>{m.category || "Catégorie à préciser"}</span>{match && <strong>{match.score}%</strong>}</div>
      <h3><Link href={`/dashboard/travailleur/missions/${m.id}`}>{m.title}</Link></h3>
      <div className="wk-dashboard-mission-meta"><span><Icon name="pin" size={14} />{m.city || "Ville à préciser"}</span><span><Icon name="calendar" size={14} />{formatDate(m.date)}</span></div>
      <div className="wk-dashboard-mission-footer"><b>{m.pay === null ? "À préciser" : `${m.pay.toLocaleString("fr-TN")} TND`}</b><FavoriteButton missionId={m.id} initialValue={m.favorites.length > 0} /><Link className="rq-button rq-primary" href={`/dashboard/travailleur/missions/${m.id}`}>Consulter <Icon name="arrow" size={14} /></Link></div>
      {match && <details className="wk-dashboard-match"><summary>Pourquoi cette recommandation ?</summary><ul>{reasons.length ? reasons.slice(0, 3).map(reason => <li key={reason.explanation}>{reason.explanation}</li>) : <li>Cette mission respecte vos contraintes obligatoires.</li>}</ul></details>}
    </div>
  </article>;
  if (compact) return <article className="wk-compact-mission-card">
    <Link className="wk-compact-card-link" href={`/dashboard/travailleur/missions/${m.id}`} aria-label={`Consulter la mission ${m.title}`}>
      <MissionArtwork category={m.category} className="wk-compact-art" />
      <div className="wk-compact-card-body">
        <div className="wk-compact-card-heading"><span className="wk-compact-category">{m.category || "Catégorie à préciser"}</span>{match && <span className="wk-compact-match">{match.score}% compatible</span>}</div>
        <h2>{m.title}</h2>
        <div className="wk-compact-meta"><span><Icon name="pin" size={14} />{m.city || "Ville à préciser"}</span><span><Icon name="calendar" size={14} />{formatDate(m.date)}</span></div>
        <div className="wk-compact-skills">{skills.length ? skills.map(skill => <span key={skill}>{skill}</span>) : <span>Compétences à préciser</span>}</div>
        <div className="wk-compact-footer"><strong>{m.pay === null ? "À préciser" : `${m.pay.toLocaleString("fr-TN")} TND`}</strong>{m.applications[0] && <Badge status={m.applications[0].status} application />}</div>
      </div>
    </Link>
    <div className="wk-compact-favorite"><FavoriteButton missionId={m.id} initialValue={m.favorites.length > 0} /></div>
  </article>;
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
