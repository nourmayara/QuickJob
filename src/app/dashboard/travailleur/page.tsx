import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { publishedMissionWhere, workerMissionInclude } from "@/lib/worker-data";
import { EmptyState, PageHeading } from "@/components/recruiter/ui";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import MissionCard from "@/components/worker/MissionCard";
export default async function WorkerDashboard() {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const [profile, published, applications, selected, missions] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { city: true, skills: true, languages: true } }),
    prisma.mission.count({ where: publishedMissionWhere }),
    prisma.application.count({ where: { workerId: user.id } }),
    prisma.application.count({ where: { workerId: user.id, status: "ACCEPTED" } }),
    prisma.mission.findMany({ where: publishedMissionWhere, include: workerMissionInclude(user.id), orderBy: { createdAt: "desc" }, take: 4 }),
  ]);
  const complete = !!(profile.city?.trim() && profile.skills?.trim() && profile.languages?.trim());
  const stats: [string, number, IconName, string][] = [["Missions disponibles", published, "search", "Publiées par les recruteurs"], ["Candidatures envoyées", applications, "briefcase", "L’ensemble de vos démarches"], ["Candidatures acceptées", selected, "check", "Vos sélections par mission"]];
  return <><PageHeading eyebrow="À VOUS DE JOUER" title={`Bonjour, ${user.firstName || user.name} 👋`} description="Présentez vos talents, trouvez une mission et suivez vos candidatures." action={<Link className="rq-button rq-primary" href="/dashboard/travailleur/missions"><Icon name="search" size={17} />Trouver une mission</Link>} />
    <div className="rq-stats wk-stats">{stats.map(([label, value, icon, note]) => <div className="rq-stat" key={label}><div className="rq-stat-top"><span>{label}</span><span className="rq-stat-icon"><Icon name={icon} size={18} /></span></div><strong>{value}</strong><small>{note}</small></div>)}</div>
    <div className="wk-profile-notice"><div><strong>{complete ? "Votre profil est prêt à vous présenter" : "Faites découvrir vos talents"}</strong><p>{complete ? "Gardez vos compétences, vos expériences et vos langues à jour." : "Complétez votre ville, vos compétences et vos langues pour vous présenter aux recruteurs."}</p></div><Link className="rq-button" href="/dashboard/travailleur/profil">{complete ? "Voir mon profil" : "Compléter mon profil"}<Icon name="arrow" size={15} /></Link></div>
    <div className="rq-panel-heading" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 0 }}><div><h2>Les dernières missions</h2><p>De nouvelles occasions de mettre vos compétences en pratique.</p></div><Link className="rq-link" href="/dashboard/travailleur/missions">Toutes les missions <Icon name="arrow" size={14} /></Link></div>
    {missions.length ? <div className="wk-missions-grid">{missions.map(m => <MissionCard key={m.id} mission={m} />)}</div> : <div className="rq-panel"><EmptyState icon="search" title="Les prochaines missions vous attendent">Aucune mission n’est publiée pour le moment. Les nouvelles opportunités apparaîtront ici.</EmptyState></div>}
    <Link className="rq-quick" href="/dashboard/travailleur/candidatures"><span><Icon name="briefcase" /></span><div><strong>Suivre mes candidatures</strong><p>Consultez les réponses des recruteurs et les statuts de vos missions.</p></div><Icon name="arrow" size={17} /></Link>
  </>;
}
