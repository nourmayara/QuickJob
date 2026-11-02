import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { recommendReplacementCandidates } from "@/lib/matching-service";
import { EmptyState, PageHeading, Panel } from "@/components/recruiter/ui";
import ReplacementOfferButton from "@/components/recruiter/ReplacementOfferButton";
export default async function ReplacementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["RECRUTEUR"]), id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const cancelled = await prisma.application.findFirst({ where: { id, mission: { recruiterId: user.id }, status: "CANCELLED", cancelledBy: "WORKER", cancelledFromStatus: "ACCEPTED" }, select: { worker: { select: { firstName: true, name: true } }, mission: { select: { title: true } } } });
  if (!cancelled) notFound();
  const [candidates, pendingOffer] = await Promise.all([recommendReplacementCandidates(user.id, id, 10), prisma.replacementOffer.findFirst({ where: { cancelledApplicationId: id, status: "PENDING" }, select: { id: true } })]);
  return <><PageHeading eyebrow="REMPLACEMENT ASSISTÉ" title="Trouver un remplaçant avec l’IA" description={`${cancelled.worker.firstName} ${cancelled.worker.name} a annulé sa participation à « ${cancelled.mission.title} ». Le classement reste une aide : vous choisissez à qui proposer la place.`} />{pendingOffer && <p className="rq-notice">Une proposition est déjà en attente de réponse.</p>}<Panel title="Profils disponibles et éligibles" description="Les candidatures existantes sont prioritaires, puis les profils ayant accepté les recommandations.">{candidates?.length ? <div className="rq-replacement-grid">{candidates.map(candidate => <article className="rq-replacement-card" key={candidate.worker.id}><div className="rq-replacement-head"><div><span>{candidate.existingApplication ? "CANDIDATURE EXISTANTE" : "PROFIL DISPONIBLE"}</span><h2>{candidate.worker.firstName} {candidate.worker.name}</h2><p>{candidate.worker.city || "Ville non renseignée"}</p></div><strong>{candidate.match.score}%</strong></div><p className="rq-replacement-skills"><b>Compétences :</b> {candidate.worker.skills || "Non renseignées"}</p><details><summary>Pourquoi ce profil ?</summary><ul>{candidate.strengths.slice(0, 4).map(strength => <li key={strength}>{strength}</li>)}</ul></details>{!pendingOffer && <ReplacementOfferButton cancelledApplicationId={id} candidateId={candidate.worker.id} />}</article>)}</div> : <EmptyState icon="people" title="Aucun remplaçant éligible">Aucun profil disponible ne satisfait actuellement les contraintes obligatoires et le créneau.</EmptyState>}</Panel></>;
}
