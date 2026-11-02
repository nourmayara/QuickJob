import Link from "next/link";
import { workerDashboardData } from "@/lib/dashboard-data";
import { requirePageRole } from "@/lib/authorization";
import { EmptyState, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
import DashboardStat from "@/components/DashboardStat";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import MissionCard from "@/components/worker/MissionCard";
import { recommendMissionsForWorker } from "@/lib/matching-service";
export default async function WorkerDashboard() {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const [data, recommendations] = await Promise.all([workerDashboardData(user.id), recommendMissionsForWorker(user.id, 4)]);
  const { profile, published, applications, selected } = data;
  const complete = !!(profile.city?.trim() && profile.skills?.trim() && profile.languages?.trim());
  const payKnown = data.completed === 0 || data.missingPay < data.completed;
  const stats: [string, string | number, number | null, string, IconName, string][] = [
    ["Missions réalisées", data.completed, data.completed, "completed", "check", "Candidatures acceptées sur des missions terminées"],
    ["Candidatures en attente", data.pending, data.pending, "pending", "briefcase", `Missions publiées, complètes ou clôturées · ${applications} candidature(s) au total`],
    ["Prochaines missions confirmées", data.upcomingCount, data.upcomingCount, "upcoming", "calendar", `${selected} candidature(s) acceptée(s), toutes dates confondues`],
    ["Note moyenne", data.averageRating === null ? "Aucun avis" : `${data.averageRating.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 5`, data.averageRating, "rating", "user", `${data.reviewCount} évaluation(s) enregistrée(s)`],
    ["Rémunération déclarée", payKnown ? `${data.declaredPay.toLocaleString("fr-TN", { maximumFractionDigits: 3 })} TND` : "Non renseignée", payKnown ? data.declaredPay : null, "declaredPay", "briefcase", `Montants des missions terminées, sans preuve de paiement${data.missingPay ? ` · ${data.missingPay} montant(s) non renseigné(s)` : ""}`],
    ["Missions disponibles", published, published, "available", "search", "À venir, publiées et sans candidature de votre part"],
  ];
  return <><PageHeading eyebrow="À VOUS DE JOUER" title={`Bonjour, ${user.firstName || user.name}`} description="Présentez vos talents, trouvez une mission et suivez vos candidatures." action={<Link className="rq-button rq-primary" href="/dashboard/travailleur/missions"><Icon name="search" size={17} />Trouver une mission</Link>} />
    <div className="rq-stats wk-stats">{stats.map(([label, value, rawValue, metric, icon, description]) => <DashboardStat key={metric} {...{ label, value, rawValue, metric, icon, description }} />)}</div>
    <Panel title="Prochaines missions confirmées" description="Candidatures acceptées sur des missions actives dont le début n’est pas encore passé. Horaires en Tunisie.">{data.upcoming.length ? data.upcoming.map(m => <Link key={m.id} className="rq-upcoming" href={`/dashboard/travailleur/candidatures/${m.applications[0].id}`}><span className="rq-date-tile"><strong>{m.date?.getUTCDate()}</strong>{m.date?.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}</span><div><h3>{m.title}</h3><p>{formatDate(m.date)} · {m.startTime}–{m.endTime}</p><p>{m.city || "Lieu à préciser"}</p></div></Link>) : <EmptyState icon="calendar" title="Aucune mission confirmée à venir">Vos missions acceptées apparaîtront ici dès leur confirmation.</EmptyState>}</Panel>
    <div className="wk-profile-notice"><div><strong>{complete ? "Votre profil est prêt à vous présenter" : "Faites découvrir vos talents"}</strong><p>{complete ? "Gardez vos compétences, vos expériences et vos langues à jour." : "Complétez votre ville, vos compétences et vos langues pour vous présenter aux recruteurs."}</p></div><Link className="rq-button" href="/dashboard/travailleur/profil">{complete ? "Voir mon profil" : "Compléter mon profil"}<Icon name="arrow" size={15} /></Link></div>
    <section className="wk-recommendations" aria-labelledby="dashboard-recommendations"><div className="rq-panel-heading" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}><div><span className="wk-aurora-kicker">MATCHING INTELLIGENT</span><h2 id="dashboard-recommendations">Missions recommandées pour vous</h2><p>Classement actualisé selon votre profil, vos disponibilités et les contraintes réelles des missions.</p></div><Link className="rq-link" href="/dashboard/travailleur/missions">Toutes les missions <Icon name="arrow" size={14} /></Link></div>
    {recommendations.length ? <div className="wk-missions-grid">{recommendations.map(m => <MissionCard key={m.id} mission={m} match={m.match} />)}</div> : <div className="rq-panel"><EmptyState icon="search" title="Aucune recommandation compatible">Complétez votre profil et vos disponibilités, ou revenez lorsque de nouvelles missions seront publiées.</EmptyState></div>}</section>
    <Link className="rq-quick" href="/dashboard/travailleur/candidatures"><span><Icon name="briefcase" /></span><div><strong>Suivre mes candidatures</strong><p>Consultez les réponses des recruteurs et les statuts de vos missions.</p></div><Icon name="arrow" size={17} /></Link>
  </>;
}
