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
import "./mission-detail.css";

export default async function WorkerMissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const m = await prisma.mission.findFirst({ where: { id, ...visibleWorkerMission(user.id) }, include: workerMissionInclude(user.id) });
  if (!m) notFound();
  const application = m.applications[0];
  const recruiter = m.recruiter.companyName || `${m.recruiter.firstName} ${m.recruiter.name}`;
  const canApply = !application && m.status === "PUBLISHED" && m._count.applications < m.capacity;
  return <div className="wk-mission-detail-page">
    <div className="wk-mission-detail-title"><Link className="rq-button" href="/dashboard/travailleur/missions" aria-label="Retour aux missions">←</Link><PageHeading title="Détail de la mission" description={m.title} /></div>
    <section className="wk-mission-hero">
      <div className="wk-mission-hero-copy"><div className="wk-mission-hero-badges"><span className="wk-category">{m.category || "Catégorie à préciser"}</span><Badge status={m.status} /></div><h1>{m.title}</h1><p>{recruiter}</p><div className="wk-mission-hero-meta"><span>{m.city || "Ville à préciser"}</span><span>{formatDate(m.date)}</span></div></div>
      <MissionArtwork category={m.category} className="wk-mission-hero-art" />
    </section>
    <div className="wk-mission-detail-layout">
      <main className="wk-mission-detail-main">
        <Panel title="À propos de cette mission" className="wk-mission-about"><div className="rq-detail"><p className="rq-description">{m.description}</p></div></Panel>
        <Panel title="Détails de la mission" className="wk-mission-facts-panel"><div className="rq-detail"><dl className="rq-detail-grid"><div><dt>Lieu</dt><dd>{[m.address, m.city].filter(Boolean).join(", ") || "À préciser"}</dd></div><div><dt>Date</dt><dd>{formatDate(m.date)}</dd></div><div><dt>Horaires (Tunisie)</dt><dd>{m.startTime || "—"} – {m.endTime || "—"}</dd></div><div><dt>Compétences souhaitées</dt><dd>{m.skills || "Non précisées"}</dd></div><div><dt>Expérience souhaitée</dt><dd>{m.experience || "Non précisée"}</dd></div><div><dt>Secteur du recruteur</dt><dd>{m.recruiter.sector || "Non renseigné"}</dd></div></dl></div></Panel>
      </main>
      <aside className="wk-mission-detail-side">
        <Panel title="Votre participation" className="wk-participation-card"><div className="rq-detail"><div className="wk-pay-card"><p className="wk-detail-pay">{m.pay === null ? "À préciser" : `${m.pay.toLocaleString("fr-TN")} TND`}</p><p>Par travailleur et par mission</p></div><p className="wk-places">{m.status === "PUBLISHED" ? `${Math.max(0, m.capacity - m._count.applications)} / ${m.capacity} places disponibles` : "Cette mission n’est plus ouverte au recrutement."}</p>{application && <div className="wk-application-state"><Badge status={application.status} application /><p>Candidature envoyée le {formatDate(application.createdAt)}.</p><Link href={`/dashboard/travailleur/candidatures/${application.id}`} className="rq-button rq-primary">Suivre ma candidature</Link></div>}</div></Panel>
        {canApply && <Panel title="Postuler à cette mission" className="wk-apply-panel"><div className="rq-detail"><ApplyForm missionId={m.id} /></div></Panel>}
        {!canApply && !application && <p className="rq-notice wk-closed-notice">Cette mission n’accepte plus de nouvelles candidatures.</p>}
        <Panel title="Actions" className="wk-mission-actions-panel"><div className="rq-detail"><FavoriteButton missionId={m.id} initialValue={m.favorites.length > 0} /><ReportForm missionId={m.id} targetUserId={m.recruiterId} /></div></Panel>
      </aside>
    </div>
  </div>;
}
