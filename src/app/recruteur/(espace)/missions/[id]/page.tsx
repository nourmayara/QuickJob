import { ownedMission } from "@/lib/recruiter-data";
import { Badge, PageHeading, Panel, formatDate } from "@/components/recruiter/ui";
import MissionActions from "@/components/recruiter/MissionActions";
export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const m = await ownedMission((await params).id);
  return <><PageHeading eyebrow={`MISSION #${m.id}`} title={m.title} description={`Créée le ${formatDate(m.createdAt)}`} action={<Badge status={m.status} />} /><Panel title="Détails de la mission"><div className="rq-detail"><p className="rq-description">{m.description}</p><dl className="rq-detail-grid">{[["Catégorie", m.category || "Non renseignée"], ["Date", formatDate(m.date)], ["Horaire (Tunisie)", `${m.startTime || "—"} – ${m.endTime || "—"}`], ["Lieu", [m.address, m.city].filter(Boolean).join(", ") || "Non renseigné"], ["Rémunération par travailleur", m.pay === null ? "Non renseignée" : `${m.pay.toLocaleString("fr-TN")} TND`], ["Places occupées", `${m.applications.length} / ${m.capacity}`], ["Candidatures reçues", m._count.applications], ["Compétences souhaitées", m.skills || "Non renseignées"], ["Expérience souhaitée", m.experience || "Non précisée"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><MissionActions id={m.id} status={m.status} /></div></Panel></>;
}
