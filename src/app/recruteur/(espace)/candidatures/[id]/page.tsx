import ReportForm from "@/components/ReportForm";
import ApplicationCollaboration from "@/components/communication/ApplicationCollaboration";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { workerSelect } from "@/lib/recruiter-data";
import { Avatar, Badge, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
import ConfirmAction from "@/components/recruiter/ConfirmAction";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["RECRUTEUR"]);
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const a = await prisma.application.findFirst({ where: { id, mission: { recruiterId: user.id } }, include: { worker: { select: workerSelect }, mission: { include: { _count: { select: { applications: { where: { status: "ACCEPTED" } } } } } } } });
  if (!a) notFound();
  const available = a.mission.capacity - a.mission._count.applications;
  const reviewable = ["PUBLISHED", "FULL", "CLOSED"].includes(a.mission.status);
  return <><PageHeading eyebrow={`CANDIDATURE #${a.id}`} title={`${a.worker.firstName} ${a.worker.name}`} description={`Candidature reçue le ${formatDate(a.createdAt)}`} action={<Badge status={a.status} application />} />
    <Panel title="Profil du travailleur"><div className="rq-detail"><div className="rq-profile-summary">{a.worker.avatarUrl ? <Image unoptimized={!a.worker.avatarUrl.startsWith("/images/")} sizes="56px" src={a.worker.avatarUrl} alt="Photo du travailleur" width={56} height={56} style={{ width: 56, height: "auto", objectFit: "cover", borderRadius: 12 }} /> : <Avatar name={`${a.worker.firstName} ${a.worker.name}`} />}<div><h2>{a.worker.firstName} {a.worker.name}</h2><p className="rq-subtle">{a.worker.city || "Ville non renseignée"}</p></div></div><dl className="rq-detail-grid"><div><dt>Compétences principales</dt><dd>{a.worker.skills || "Non renseignées"}</dd></div><div><dt>Mission concernée</dt><dd><Link className="rq-link" href={`/recruteur/missions/${a.missionId}`}>{a.mission.title}</Link></dd></div><div><dt>Places disponibles</dt><dd>{Math.max(0, available)} / {a.mission.capacity}</dd></div></dl><p className="rq-description">{a.worker.bio || "Ce travailleur n’a pas encore renseigné de présentation professionnelle."}</p>
      {a.status === "PENDING" && reviewable && <div className="rq-detail-actions">{available > 0 && a.mission.status === "PUBLISHED" && <ConfirmAction primary endpoint={`/api/applications/${a.id}`} data={{ status: "ACCEPTED" }} label="Accepter la candidature" title="Accepter cette candidature ?" description={`${a.worker.firstName} sera sélectionné pour « ${a.mission.title} ». Une place sera occupée.`} />}<ConfirmAction danger endpoint={`/api/applications/${a.id}`} data={{ status: "REJECTED" }} label="Refuser la candidature" title="Refuser cette candidature ?" description="La candidature sera refusée. Cette décision est définitive." /></div>}
      {a.status === "PENDING" && (!reviewable || available <= 0 || a.mission.status === "CLOSED") && <p className="rq-notice" style={{ marginTop: 20 }}>L’acceptation est indisponible : la mission est complète, clôturée ou n’est plus ouverte au recrutement.</p>}
      {a.status === "CANCELLED" && a.cancelledBy === "WORKER" && a.cancelledFromStatus === "ACCEPTED" && <div className="rq-replacement-launch"><p>Ce travailleur sélectionné a annulé sa participation. La place a été libérée.</p><Link className="rq-button rq-primary" href={`/recruteur/candidatures/${a.id}/remplacement`}>Trouver un remplaçant avec l’IA</Link></div>}
      <div className="rq-detail-actions"><Link className="rq-button" href={`/recruteur/candidatures?mission=${a.missionId}`}>Retour aux candidatures de la mission</Link></div>
    </div></Panel>
    <Panel title="Expériences et motivation"><div className="rq-detail"><h2>Expériences professionnelles</h2><p className="rq-description" style={{ marginTop: 10, marginBottom: 24 }}>{a.worker.experience || "Aucune expérience renseignée."}</p><h2>Langues</h2><p className="rq-description" style={{ marginTop: 10, marginBottom: 24 }}>{a.worker.languages || "Non renseignées"}</p><h2>Message de candidature</h2><p className="rq-description" style={{ marginTop: 10 }}>{a.message || "Aucun message ajouté à cette candidature."}</p></div></Panel>
  <ApplicationCollaboration applicationId={a.id} user={user} accepted={a.status === "ACCEPTED"} /><ReportForm missionId={a.missionId} targetUserId={a.worker.id} /></>;
}
