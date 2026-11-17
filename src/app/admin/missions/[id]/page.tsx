import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requirePageRole } from "@/lib/authorization";
import { Panel, Badge, formatDate } from "@/components/recruiter/ui";
import Icon, { type IconName } from "@/components/recruiter/Icon";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import ModerationForm from "@/components/admin/ModerationForm";
import AdminHistory from "@/components/admin/AdminHistory";
function Field({ icon, label, value }: { icon: IconName; label: string; value: string | null | undefined }) { return <div className="qa-admin-detail-field"><Icon name={icon} size={18} /><div><dt>{label}</dt><dd className="qa-long-text">{value || "Non renseigné"}</dd></div></div>; }
export default async function MissionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole(["ADMIN"]); const id = Number((await params).id); if (!Number.isSafeInteger(id) || id <= 0) notFound(); const mission = await prisma.mission.findUnique({ where: { id }, include: { recruiter: { select: { firstName: true, name: true } }, _count: { select: { applications: true } } } }); if (!mission) notFound();
  return <main className="qa-admin-page qa-admin-detail-page"><AdminPageHeader icon="briefcase" title={mission.title} description={`Mission #${id}`} action={<><Badge status={mission.status} /><Link className="qa-admin-back" href="/admin/missions"><Icon name="arrow" size={15} />Retour</Link></>} />
    <Panel title="Informations de la mission"><div className="qa-admin-detail-body"><p className="qa-admin-description">{mission.description}</p><dl className="qa-admin-detail-grid"><Field icon="user" label="Recruteur" value={`${mission.recruiter.firstName} ${mission.recruiter.name}`} /><Field icon="pin" label="Lieu" value={[mission.address, mission.city].filter(Boolean).join(", ")} /><Field icon="calendar" label="Date" value={formatDate(mission.date)} /><Field icon="clock" label="Horaire (Tunisie)" value={`${mission.startTime || "—"}–${mission.endTime || "—"}`} /><Field icon="layers" label="Catégorie" value={mission.category} /><Field icon="star" label="Compétences" value={mission.skills} /><Field icon="briefcase" label="Expérience" value={mission.experience} /><Field icon="document" label="Rémunération déclarée" value={mission.pay === null ? "Non renseignée" : `${mission.pay} TND`} /><Field icon="people" label="Places" value={String(mission.capacity)} /><Field icon="mail" label="Candidatures" value={String(mission._count.applications)} /></dl><Link className="qa-admin-action" href={`/admin/utilisateurs/${mission.recruiterId}`}><Icon name="eye" size={16} />Consulter le recruteur</Link></div></Panel>
    {mission.status !== "MODERATED" && <Panel title="Modération"><div className="qa-admin-form-wrap"><ModerationForm mode="mission" endpoint={`/api/admin/missions/${id}`} /></div></Panel>}<div className="qa-admin-history"><AdminHistory type="MISSION" id={id} /></div>
  </main>;
}
