import RefreshStatus from "@/components/worker/RefreshStatus";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { Badge, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
export default async function WorkerApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const a = await prisma.application.findFirst({ where: { id, workerId: user.id }, include: { mission: { select: { id: true, title: true, status: true, date: true, city: true } } } });
  if (!a) notFound();
  const messages: Record<string, string> = { PENDING: "Votre candidature a été enregistrée et est en attente de réponse du recruteur.", ACCEPTED: "Le recruteur a accepté votre candidature. Consultez aussi le statut de la mission pour suivre son évolution.", REJECTED: "Le recruteur n’a pas retenu votre candidature. Vous pouvez continuer à explorer les autres missions." };
  return <><PageHeading eyebrow={`CANDIDATURE #${a.id}`} title={a.mission.title} description={`Envoyée le ${formatDate(a.createdAt)}`} action={<div className="wk-refresh"><Badge status={a.status} application /><RefreshStatus /></div>} /><Panel title="Suivi de ma candidature"><div className="rq-detail"><p className="rq-notice">{messages[a.status] || "Consultez le statut de votre candidature."}</p><dl className="rq-detail-grid"><div><dt>Date de mission</dt><dd>{formatDate(a.mission.date)}</dd></div><div><dt>Lieu</dt><dd>{a.mission.city || "À préciser"}</dd></div><div><dt>Statut de la mission</dt><dd><Badge status={a.mission.status} /></dd></div></dl><h2 style={{ marginBottom: 12 }}>Votre message au recruteur</h2><p className="rq-description">{a.message || "Aucun message ajouté à cette candidature."}</p><div className="rq-detail-actions">{a.mission.status !== "MODERATED" && <Link className="rq-button" href={`/dashboard/travailleur/missions/${a.missionId}`}>Revoir la mission</Link>}<Link className="rq-button" href="/dashboard/travailleur/candidatures">Toutes mes candidatures</Link></div></div></Panel></>;
}
