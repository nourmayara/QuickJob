import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { PageHeading, Panel, Badge, formatDate } from "@/components/recruiter/ui";
import ModerationForm from "@/components/admin/ModerationForm";
import AdminHistory from "@/components/admin/AdminHistory";
export default async function MissionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(["ADMIN"]); const id = Number((await params).id); if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const m = await prisma.mission.findUnique({ where: { id }, include: { recruiter: { select: { firstName: true, name: true } }, _count: { select: { applications: true } } } }); if (!m) notFound();
  return <><PageHeading title={m.title} description={`Mission #${id}`} action={<Badge status={m.status} />} /><Panel title="Informations de la mission"><div className="rq-detail"><p className="qa-long-text">{m.description}</p><dl className="rq-detail-grid">{[["Recruteur", `${m.recruiter.firstName} ${m.recruiter.name}`], ["Lieu", [m.address, m.city].filter(Boolean).join(", ")], ["Date", formatDate(m.date)], ["Horaire (Tunisie)", `${m.startTime || "—"}–${m.endTime || "—"}`], ["Catégorie", m.category], ["Compétences", m.skills], ["Expérience", m.experience], ["Rémunération déclarée", m.pay === null ? "Non renseignée" : `${m.pay} TND`], ["Places", String(m.capacity)], ["Candidatures", String(m._count.applications)]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="qa-long-text">{v || "Non renseigné"}</dd></div>)}</dl><Link className="rq-link" href={`/admin/utilisateurs/${m.recruiterId}`}>Consulter le recruteur</Link></div></Panel>{m.status !== "MODERATED" && <Panel title="Modération"><ModerationForm mode="mission" endpoint={`/api/admin/missions/${id}`} /></Panel>}<AdminHistory type="MISSION" id={id} /></>;
}
