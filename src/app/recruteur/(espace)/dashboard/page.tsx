import Link from "next/link";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { missionInclude, workerSelect } from "@/lib/recruiter-data";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import { Avatar, Badge, EmptyState, PageHeading, Panel, PublishLink, formatDate } from "@/components/recruiter/ui";
import MissionTable from "@/components/recruiter/MissionTable";

export default async function RecruiterDashboard() {
  const user = await requirePageRole(["RECRUTEUR"]);
  const scope = { recruiterId: user.id };
  const [active, applications, selected, completed, missions, recent, upcoming] = await Promise.all([
    prisma.mission.count({ where: { ...scope, status: { in: ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"] } } }),
    prisma.application.count({ where: { mission: scope } }),
    prisma.application.count({ where: { mission: scope, status: "ACCEPTED" } }),
    prisma.mission.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.mission.findMany({ where: scope, include: missionInclude, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.application.findMany({ where: { mission: scope }, include: { worker: { select: workerSelect }, mission: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.mission.findMany({ where: { ...scope, date: { gte: new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Tunis" }) + "T00:00:00Z") }, status: { in: ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"] } }, include: missionInclude, orderBy: { date: "asc" }, take: 3 }),
  ]);
  const stats: [string, number, IconName, string][] = [["Missions actives", active, "briefcase", "Publiées, complètes ou en cours"], ["Candidatures reçues", applications, "people", "Sur l’ensemble de vos missions"], ["Travailleurs sélectionnés", selected, "check", "Candidatures acceptées"], ["Missions terminées", completed, "calendar", "Votre historique de missions"]];
  return <>
    <PageHeading eyebrow="VOTRE ACTIVITÉ, EN UN CLIN D’ŒIL" title={`Bonjour, ${user.firstName || user.name} 👋`} description="Gérez vos missions et trouvez les bons talents pour vos besoins." action={<PublishLink />} />
    <div className="rq-stats">{stats.map(([label, value, icon, note]) => <div className="rq-stat" key={label}><div className="rq-stat-top"><span>{label}</span><span className="rq-stat-icon"><Icon name={icon} size={18} /></span></div><strong>{value}</strong><small>{note}</small></div>)}</div>
    <Panel title="Mes missions récentes" description="Suivez vos dernières publications et leur avancement." action={<Link className="rq-link" href="/recruteur/missions">Voir toutes mes missions <Icon name="arrow" size={14} /></Link>}><MissionTable missions={missions} />{!missions.length && <div style={{ textAlign: "center", paddingBottom: 24 }}><PublishLink /></div>}</Panel>
    <div className="rq-dashboard-columns"><Panel title="Candidatures récentes" description="Les derniers talents qui souhaitent vous rejoindre." action={<Link href="/recruteur/candidatures" className="rq-link">Tout voir <Icon name="arrow" size={14} /></Link>}>
      {recent.length ? recent.map(a => <div key={a.id} className="rq-person-row"><div className="rq-person"><Avatar name={`${a.worker.firstName} ${a.worker.name}`} /><div><strong>{a.worker.firstName} {a.worker.name}</strong><small>{a.mission.title}</small><p className="rq-person-skill">{a.worker.skills || "Compétences non renseignées"} · {formatDate(a.createdAt)}</p></div></div><div className="rq-person-meta"><Badge status={a.status} application /><Link className="rq-link" href={`/recruteur/candidatures/${a.id}`}>Voir le profil</Link></div></div>) : <EmptyState icon="people" title="Vos futurs talents sont en chemin">Les candidatures reçues apparaîtront ici dès qu’un travailleur postulera à l’une de vos missions.</EmptyState>}
    </Panel><Panel title="Prochaines missions" description="Un aperçu de votre agenda.">
      {upcoming.length ? upcoming.map(m => <Link key={m.id} href={`/recruteur/missions/${m.id}`} className="rq-upcoming"><span className="rq-date-tile"><strong>{m.date?.getUTCDate()}</strong>{m.date?.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}</span><div><h3>{m.title}</h3><p><Icon name="clock" size={12} />{formatDate(m.date)} · {m.startTime || "—"} – {m.endTime || "—"}</p><p><Icon name="pin" size={12} />{[m.address, m.city].filter(Boolean).join(", ") || "Lieu à préciser"}</p><p><Icon name="people" size={12} />{m.applications.length} travailleur{m.applications.length > 1 ? "s" : ""} sélectionné{m.applications.length > 1 ? "s" : ""}</p></div></Link>) : <EmptyState icon="calendar" title="Un agenda prêt à se remplir">Aucune mission à venir pour le moment. Vos prochaines missions planifiées s’afficheront ici.</EmptyState>}
    </Panel></div>
    <h2 className="rq-section-label">Actions rapides</h2><div className="rq-quick-actions">{([["missions/nouvelle", "Publier une mission", "Trouvez vos prochains talents", "plus"], ["candidatures", "Gérer les candidatures", "Composez votre équipe", "people"], ["missions", "Consulter mes missions", "Gardez le fil de votre activité", "briefcase"]] as const).map(([href, title, note, icon]) => <Link className="rq-quick" href={`/recruteur/${href}`} key={href}><span><Icon name={icon} /></span><div><strong>{title}</strong><p>{note}</p></div><Icon name="arrow" size={16} /></Link>)}</div>
  </>;
}
