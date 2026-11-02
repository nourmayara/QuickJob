import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { reportInclude } from "@/lib/admin-service";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import ModerationForm from "@/components/admin/ModerationForm";
import AdminHistory from "@/components/admin/AdminHistory";
export default async function ReportDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(["ADMIN"]); const id = Number((await params).id); if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const r = await prisma.report.findUnique({ where: { id }, include: reportInclude }); if (!r) notFound();
  return <><PageHeading title={`Signalement #${id}`} description={`${r.kind} · ${r.status}`} /><Panel title="Détail du signalement"><div className="rq-detail"><p>Auteur : {r.author ? `${r.author.firstName} ${r.author.name} · ${r.author.email}` : "Compte supprimé"}</p><p>{r.createdAt.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })} · Tunisie</p><h2>Motif</h2><p className="qa-long-text">{r.reason}</p><div className="rq-detail-actions">{r.missionId && <Link className="rq-button" href={`/admin/missions/${r.missionId}`}>Consulter la mission</Link>}{r.targetUserId && <Link className="rq-button" href={`/admin/utilisateurs/${r.targetUserId}`}>Consulter le profil</Link>}</div>{r.resolution && <div className="rq-notice"><strong>Dernière décision</strong><p className="qa-long-text">{r.resolution}</p><small>{r.decidedAt?.toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })} · {r.moderator ? `${r.moderator.firstName} ${r.moderator.name}` : "Administrateur supprimé"}</small></div>}</div></Panel>{["NOUVEAU", "EN_COURS"].includes(r.status) && <Panel title="Traiter le signalement"><ModerationForm key={r.status} mode="report" status={r.status} endpoint={`/api/admin/signalements/${id}`} /></Panel>}<AdminHistory type="REPORT" id={id} /></>;
}
