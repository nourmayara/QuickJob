import ReportForm from "@/components/ReportForm";
import FavoriteButton from "@/components/worker/FavoriteButton";
import MissionArtwork from "@/components/worker/MissionArtwork";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { visibleWorkerMission, workerMissionInclude } from "@/lib/worker-data";
import { Badge, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
import ApplyForm from "@/components/worker/ApplyForm";

export default async function WorkerMissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const m = await prisma.mission.findFirst({ where: { id, ...visibleWorkerMission(user.id) }, include: workerMissionInclude(user.id) });
  if (!m) notFound();
  const application = m.applications[0];
  return <>
    <Link className="rq-link wk-back" href="/dashboard/travailleur/missions">← Retour aux missions</Link>
    <PageHeading eyebrow={m.category || "MISSION QUICKJOB"} title={m.title} description={m.recruiter.companyName || `${m.recruiter.firstName} ${m.recruiter.name}`} action={<Badge status={m.status} />} />
    <MissionArtwork category={m.category} className="wk-mission-detail-art" />
    <FavoriteButton missionId={m.id} initialValue={m.favorites.length > 0} />
    <div className="wk-detail-columns">
      <Panel title="À propos de cette mission"><div className="rq-detail"><p className="rq-description">{m.description}</p><dl className="rq-detail-grid"><div><dt>Lieu</dt><dd>{[m.address, m.city].filter(Boolean).join(", ") || "À préciser"}</dd></div><div><dt>Date</dt><dd>{formatDate(m.date)}</dd></div><div><dt>Horaires (Tunisie)</dt><dd>{m.startTime || "—"} – {m.endTime || "—"}</dd></div><div><dt>Compétences souhaitées</dt><dd>{m.skills || "Non précisées"}</dd></div><div><dt>Expérience souhaitée</dt><dd>{m.experience || "Non précisée"}</dd></div><div><dt>Secteur du recruteur</dt><dd>{m.recruiter.sector || "Non renseigné"}</dd></div></dl></div></Panel>
      <Panel title="Votre participation"><div className="rq-detail"><p className="wk-detail-pay">{m.pay === null ? "Rémunération à préciser" : `${m.pay.toLocaleString("fr-TN")} TND`}</p><p className="rq-subtle">Par travailleur et par mission</p><p className="wk-places">{m.status === "PUBLISHED" ? `${Math.max(0, m.capacity - m._count.applications)} / ${m.capacity} places disponibles` : "Cette mission n’est plus ouverte au recrutement."}</p>{application && <><Badge status={application.status} application /><p className="rq-subtle" style={{ marginTop: 12 }}>Candidature envoyée le {formatDate(application.createdAt)}.</p><Link href={`/dashboard/travailleur/candidatures/${application.id}`} className="rq-button wk-full-button">Suivre ma candidature</Link></>}</div></Panel>
    </div>
    {!application && m.status === "PUBLISHED" && m._count.applications < m.capacity && <Panel title="Postuler à cette mission"><div className="rq-detail"><ApplyForm missionId={m.id} /></div></Panel>}
    {!application && (m.status !== "PUBLISHED" || m._count.applications >= m.capacity) && <p className="rq-notice">Cette mission n’accepte plus de nouvelles candidatures.</p>}
    <ReportForm missionId={m.id} targetUserId={m.recruiterId} />
  </>;
}
