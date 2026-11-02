import Link from "next/link";
import { reviewData, type CommunicationActor } from "@/lib/communication-service";
import { WorkerError } from "@/lib/worker-service";
import { Panel } from "@/components/recruiter/ui";
import ReviewForm from "./ReviewForm";
import "./communication.css";
export default async function ApplicationCollaboration({ applicationId, user, accepted }: { applicationId: number; user: CommunicationActor; accepted: boolean }) {
  if (!accepted) return null;
  let data: Awaited<ReturnType<typeof reviewData>>;
  try { data = await reviewData(user, applicationId); }
  catch (error) { if (error instanceof WorkerError) return <p className="rq-notice">Messagerie et évaluations indisponibles : {error.message}</p>; throw error; }
  const base = user.role === "TRAVAILLEUR" ? "/dashboard/travailleur/messages" : "/recruteur/messages";
  const own = data.reviews.find(r => r.authorId === user.id);
  return <Panel title="Échanges et évaluations"><div className="rq-detail"><Link className="rq-button rq-primary" href={`${base}?application=${applicationId}`}>Ouvrir la conversation</Link><h2 className="qj-review-heading">Évaluer {data.recipientName}</h2><p>Moyenne reçue : {data.average === null ? "aucune évaluation" : `${data.average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 5 (${data.count} avis)`}</p>{data.reviews.map(r => <div className="rq-notice" key={r.id}><strong>{r.authorId === user.id ? "Votre évaluation enregistrée" : "Évaluation de votre interlocuteur"} : {r.rating} / 5</strong><p className="rq-description">{r.comment}</p></div>)}{data.canReview ? <ReviewForm applicationId={applicationId} /> : !own && <p className="rq-subtle">L’évaluation sera possible après la fin de l’horaire prévu et lorsque la mission sera marquée Terminée. Seules les candidatures acceptées permettent d’évaluer un participant.</p>}</div></Panel>;
}
