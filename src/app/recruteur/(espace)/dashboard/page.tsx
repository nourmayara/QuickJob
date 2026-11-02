import Link from "next/link";
import { recruiterDashboardData } from "@/lib/dashboard-data";
import { requirePageRole } from "@/lib/authorization";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import SoftIcon from "@/components/SoftIcon";
import { Avatar, Badge, EmptyState, PublishLink, formatDate } from "@/components/recruiter/ui";
import { ApplicationTrend, MissionDistribution, MissionCategories, RecruitmentFunnel } from "@/components/recruiter/RecruiterDashboardCharts";
import "./statistics.css";

export default async function RecruiterDashboard() {
  const user = await requirePageRole(["RECRUTEUR"]);
  const { active, applications, completed, missions, recent, upcoming, hired, pending, charts } = await recruiterDashboardData(user.id);
  const displayName = user.firstName || user.name;
  const stats: [string, number, IconName][] = [
    ["Missions actives", active, "briefcase"],
    ["Candidatures reçues", applications, "people"],
    ["Recrutements réalisés", hired, "handshake"],
    ["Missions terminées", completed, "calendar"],
  ];

  return <div className="rqd-page">
    <section className="rqd-welcome" aria-labelledby="recruiter-welcome-title">
      <div className="rqd-welcome-icon"><SoftIcon name="briefcase" tone="yellow" size={25} /></div>
      <div className="rqd-welcome-copy"><h1 id="recruiter-welcome-title">Bonjour, {displayName} !</h1></div>
    </section>

    <section className="rqd-kpis" aria-label="Indicateurs de recrutement">
      {stats.map(([label, value, icon], index) => <article className={`rqd-kpi rqd-kpi-${index + 1}`} key={label}>
        <SoftIcon name={icon} tone={index === 3 ? "yellow" : index === 2 ? "glass" : "sky"} size={25} />
        <div><strong data-kpi={["active", "applications", "recruitments", "completed"][index]} data-value={value}>{value.toLocaleString("fr-FR")}</strong><h2>{label}</h2></div>
      </article>)}
    </section>

    <div className="rqd-insights">
      <section className="rqd-glass rqd-performance">
          <header><div><SoftIcon name="chart" size={20} /><h2>Évolution des candidatures</h2></div></header>
        <ApplicationTrend points={charts.applications} />
      </section>
      <section className="rqd-glass rqd-distribution">
        <header><div><SoftIcon name="people" size={20} /><h2>Répartition des missions</h2></div></header>
        <MissionDistribution points={charts.missions} />
      </section>
    </div>

    <div className="rqd-feed-grid rqs-detail-grid">
      <section className="rqd-glass"><header><div><SoftIcon name="briefcase" size={20} /><h2>Missions par catégorie</h2></div></header><MissionCategories points={charts.categories} /></section>
      <section className="rqd-glass"><header><div><SoftIcon name="people" size={20} /><h2>Entonnoir de recrutement</h2></div></header><RecruitmentFunnel total={applications} pending={pending} hired={hired} /></section>
    </div>

    <div className="rqd-feed-grid">
      <section className="rqd-glass rqd-list-card">
        <header><div><SoftIcon name="briefcase" size={20} /><h2>Dernières missions</h2></div><Link href="/recruteur/missions">Voir tout <Icon name="arrow" size={14} /></Link></header>
        <div className="rqd-rows">{missions.length ? missions.slice(0, 4).map(mission => <Link href={`/recruteur/missions/${mission.id}`} className="rqd-mission-row" key={mission.id}><span className="rqd-row-icon"><Icon name="briefcase" size={17} /></span><div><strong>{mission.title}</strong><small>{mission.city || "Lieu à préciser"} · {formatDate(mission.date)}</small></div><span className="rqd-count">{mission._count.applications} candidature{mission._count.applications > 1 ? "s" : ""}</span><Badge status={mission.status} /><Icon name="arrow" size={15} /></Link>) : <EmptyState title="Votre prochaine mission commence ici">Publiez votre première mission pour recevoir des candidatures.</EmptyState>}</div>
      </section>
      <section className="rqd-glass rqd-list-card">
        <header><div><SoftIcon name="people" size={20} /><h2>Dernières candidatures</h2></div><Link href="/recruteur/candidatures">Voir tout <Icon name="arrow" size={14} /></Link></header>
        <div className="rqd-rows">{recent.length ? recent.slice(0, 4).map(application => <div className="rqd-candidate-row" key={application.id}><Avatar name={`${application.worker.firstName} ${application.worker.name}`} /><div><strong>{application.worker.firstName} {application.worker.name}</strong><small>{application.mission.title}</small></div><Badge status={application.status} application /><Link className="rqd-profile-link" href={`/recruteur/candidatures/${application.id}`} aria-label={`Voir le profil de ${application.worker.firstName}`}><Icon name="arrow" size={16} /></Link></div>) : <EmptyState icon="people" title="Vos futurs talents sont en chemin">Les nouvelles candidatures apparaîtront ici.</EmptyState>}</div>
      </section>
    </div>

    <div className="rqd-bottom-grid">
      <section className="rqd-publish-banner"><div className="rqd-megaphone"><Icon name="plus" size={27} /></div><div><h2>Publiez une nouvelle mission !</h2><p>Trouvez rapidement le bon profil pour votre équipe.</p></div><PublishLink /></section>
      <section className="rqd-glass rqd-upcoming-card"><header><div><SoftIcon name="calendar" tone="yellow" size={20} /><h2>Prochaines missions</h2></div></header>{upcoming.length ? <div className="rqd-upcoming-list">{upcoming.map(mission => <Link href={`/recruteur/missions/${mission.id}`} key={mission.id}><span className="rq-date-tile"><strong>{mission.date?.getUTCDate()}</strong>{mission.date?.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}</span><div><strong>{mission.title}</strong><small>{mission.startTime || "—"} – {mission.endTime || "—"} · {mission.city || "Lieu à préciser"}</small></div><Icon name="arrow" size={15} /></Link>)}</div> : <p className="rqd-empty-line">Aucune mission planifiée pour le moment.</p>}</section>
    </div>

    <section className="rqd-quick-actions" aria-label="Actions rapides"><h2>Actions rapides</h2><div>{([ ["/recruteur/missions/nouvelle", "plus", "Publier une mission"], ["/recruteur/candidatures", "people", "Voir les candidatures"], ["/recruteur/travailleurs", "check", "Travailleurs sélectionnés"], ["/recruteur/missions", "briefcase", "Gérer mes missions"] ] as const).map(([href, icon, label]) => <Link href={href} key={href}><SoftIcon name={icon} size={19} /><span>{label}</span><Icon name="arrow" size={14} /></Link>)}</div></section>
  </div>;
}
