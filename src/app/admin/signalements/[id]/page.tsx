import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { reportInclude } from "@/lib/admin-service";
import { Panel } from "@/components/recruiter/ui";
import Icon from "@/components/recruiter/Icon";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import ModerationForm from "@/components/admin/ModerationForm";
import AdminHistory from "@/components/admin/AdminHistory";
export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(["ADMIN"]); const id = Number((await params).id); if (!Number.isSafeInteger(id) || id <= 0) notFound(); const report = await prisma.report.findUnique({ where: { id }, include: reportInclude }); if (!report) notFound();
  return <main className="qa-admin-page qa-admin-detail-page"><AdminPageHeader icon="shield" title={`Signalement #${id}`} description="Consultez le contexte et enregistrez la décision de modération." action={<><span className={`qa-badge ${report.status}`}>{report.status.replaceAll("_", " ")}</span><Link className="qa-admin-back" href="/admin/signalements"><Icon name="arrow" size={15} />Retour</Link></>} />
    <Panel title="Détail du signalement"><div className="qa-admin-detail-body"><div className="qa-report-meta"><div><Icon name="user" size={18} /><span>Auteur</span><strong>{report.author ? `${report.author.firstName} ${report.author.name}` : "Compte supprimé"}</strong>{report.author && <small>{report.author.email}</small>}</div><div><Icon name="calendar" size={18} /><span>Date</span><strong>{report.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}</strong></div></div><section className="qa-report-reason"><h3>Motif signalé</h3><p className="qa-long-text">{report.reason}</p></section><div className="rq-detail-actions">{report.missionId && <Link className="qa-admin-action" href={`/admin/missions/${report.missionId}`}><Icon name="briefcase" size={16} />Consulter la mission</Link>}{report.targetUserId && <Link className="qa-admin-action" href={`/admin/utilisateurs/${report.targetUserId}`}><Icon name="user" size={16} />Consulter le profil</Link>}</div>{report.resolution && <div className="rq-notice"><strong>Dernière décision</strong><p className="qa-long-text">{report.resolution}</p><small>{report.decidedAt?.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })} · {report.moderator ? `${report.moderator.firstName} ${report.moderator.name}` : "Administrateur supprimé"}</small></div>}</div></Panel>
    {["NOUVEAU", "EN_COURS"].includes(report.status) && <Panel title="Traiter le signalement"><div className="qa-admin-form-wrap"><ModerationForm key={report.status} mode="report" status={report.status} endpoint={`/api/admin/signalements/${id}`} /></div></Panel>}<div className="qa-admin-history"><AdminHistory type="REPORT" id={id} /></div>
  </main>;
}
