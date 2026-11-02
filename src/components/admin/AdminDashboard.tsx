import Link from "next/link";
import { adminDashboardData } from "@/lib/dashboard-data";
import { adminDashboardActivity } from "@/lib/admin-dashboard-activity";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import { missionStatuses, applicationStatuses } from "@/lib/recruiter-validation";
import DashboardStat from "@/components/DashboardStat";
import SoftIcon from "@/components/SoftIcon";
import RefreshStatus from "@/components/worker/RefreshStatus";
import { LineChart, DonutChart, BarChart } from "./DashboardCharts";
import TunisiaMap from "./TunisiaMap";
import "@/app/admin/admin.css";
import "./admin-dashboard.css";

export default async function AdminDashboard({ name }: { name: string }) {
  const [data, activity] = await Promise.all([adminDashboardData(), adminDashboardActivity()]);
  const roles: Record<string, string> = { TRAVAILLEUR: "Travailleurs", RECRUTEUR: "Recruteurs", ADMIN: "Administrateurs" };
  const knownRoles = ["TRAVAILLEUR", "RECRUTEUR", "ADMIN"];
  const rolePoints = [...knownRoles, ...data.usersByRole.filter(g => !knownRoles.includes(g.role)).map(g => g.role)].map(role => ({ label: roles[role] || role, value: data.usersByRole.find(g => g.role === role)?.count || 0, metric: `role-${role}` }));
  const statusColors: Record<string, string> = { COMPLETED: "#31c98a", PUBLISHED: "#2864ff", FULL: "#39b8f6", IN_PROGRESS: "#ffcc32", CLOSED: "#fa91ac", CANCELLED: "#fa7197", DRAFT: "#9b8bc9", MODERATED: "#a45bfa" };
  const applicationColors: Record<string, string> = { ACCEPTED: "#31c98a", CANCELLED: "#39b8f6", PENDING: "#ffcc32", REJECTED: "#fa7197" };
  const applicationPoints = Object.entries(applicationStatuses).map(([status, label]) => ({ label: String(label), value: data.applicationsByStatus.find(g => g.status === status)?.count || 0, color: applicationColors[status] }));
  applicationPoints.push(...data.applicationsByStatus.filter(g => !(g.status in applicationStatuses)).map(g => ({ label: g.status, value: g.count, color: "#a45bfa" })));
  return <div className="ad-dashboard">
    <div className="ad-welcome"><PageHeading eyebrow="CENTRE DE CONTRÔLE QUICKJOB" title={`Bonjour ${name}`} description="Voici un aperçu global de l’activité de la plateforme." action={<RefreshStatus />} /><div className="ad-welcome-art" aria-hidden="true"><SoftIcon name="briefcase" size={64} /><SoftIcon name="people" size={38} /></div></div>
    <div className="rq-stats ad-kpis">
      <DashboardStat label="Utilisateurs" value={data.users} rawValue={data.users} metric="users" icon="people" description={`${data.suspended} compte(s) suspendu(s), inclus`} />
      <DashboardStat label="Missions" value={data.missions} rawValue={data.missions} metric="missions" icon="briefcase" description="Brouillons et historique inclus" />
      <DashboardStat label="Candidatures" value={data.applications} rawValue={data.applications} metric="applications" icon="mail" description="Tous les statuts enregistrés" />
      <Link href="/admin/recruteurs" className="ad-kpi-link"><DashboardStat label="Recruteurs à vérifier" value={data.pendingRecruiters} rawValue={data.pendingRecruiters} metric="pendingRecruiters" icon="shield" description="Examiner les demandes →" /></Link>
      <DashboardStat label="Signalements" value={data.reports.total} rawValue={data.reports.total} metric="reports" icon="pin" description="Dossiers traités inclus" />
    </div>
    <div className="ad-grid">
      <Panel className="ad-panel" title="Évolution des inscriptions" description="Six derniers mois · heure de Tunisie · mois courant en cours" action={<SoftIcon name="chart" />}><LineChart points={data.charts.registrations} /></Panel>
      <Panel className="ad-panel" title="Répartition des utilisateurs" action={<SoftIcon name="people" />}><DonutChart points={rolePoints} label="Utilisateurs" /></Panel>
      <Panel className="ad-panel" title="Missions par catégorie" description="Toutes les missions · dix catégories principales et autres" action={<SoftIcon name="briefcase" />}><BarChart points={data.charts.categories} /></Panel>
      <Panel className="ad-panel" title="Répartition géographique des missions" action={<SoftIcon name="pin" />}><TunisiaMap points={data.charts.locations} total={data.missions} /></Panel>
    </div>
    <div className="ad-bottom-grid">
      <Panel className="ad-panel" title="Missions par statut" action={<SoftIcon name="briefcase" />}><DonutChart points={data.missionsByStatus.map(g => ({ label: missionStatuses[g.status as keyof typeof missionStatuses] || g.status, value: g.count, color: statusColors[g.status] }))} label="Missions" /></Panel>
      <Panel className="ad-panel" title="Candidatures par statut" action={<SoftIcon name="mail" />}><BarChart points={applicationPoints} vertical /></Panel>
      <Panel className="ad-panel" title="Activités récentes" action={<SoftIcon name="clock" />}><ol className="ad-timeline">{activity.map(a => <li key={a.id}><SoftIcon name={a.icon} size={22} /><div><Link href={a.href}>{a.title}</Link><p>{a.detail}</p><time dateTime={a.date.toISOString()}>{a.date.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" })}</time></div></li>)}</ol>{!activity.length && <p className="ad-empty">Aucune activité enregistrée.</p>}</Panel>
    </div>
    <Panel title="Actions rapides" className="ad-panel ad-actions"><Link className="rq-button" href="/admin/recruteurs"><SoftIcon name="shield" />Vérifier les recruteurs</Link><Link className="rq-button" href="/admin/categories"><SoftIcon name="grid" />Gérer les catégories</Link><Link className="rq-button" href="/admin/missions"><SoftIcon name="briefcase" />Consulter les missions</Link><Link className="rq-button" href="/admin/signalements"><SoftIcon name="pin" />Voir les signalements</Link></Panel>
  </div>;
}
