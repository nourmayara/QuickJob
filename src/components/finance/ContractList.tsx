import prisma from "@/lib/prisma";
import { Panel } from "@/components/recruiter/ui";
import AcceptContract from "./AcceptContract";
import ContractDialog from "./ContractDialog";
import EngagementActions from "./EngagementActions";
import StripeCheckout from "./StripeCheckout";
import RefundForm from "./RefundForm";
import { stripeTestAmount } from "@/lib/stripe-test";
import { canCheckIn, canCheckOut, hasValidatedCheckOut } from "@/lib/engagement-attendance";

const engagementLabels: Record<string, string> = {
  AWAITING_CONTRACTS: "Contrats en attente", CONFIRMED: "Confirmé", CANCELLED: "Annulé",
  IN_PROGRESS: "En cours", AWAITING_VALIDATION: "Check-in requis", AWAITING_PAYMENT: "Terminée et validée",
  DISPUTED: "En litige", PAID: "Payé", REFUNDED: "Remboursé",
};
const activeMissionStatuses = ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"];
const partyLabels: Record<string, string> = { RECRUTEUR: "Recruteur", TRAVAILLEUR: "Travailleur" };
const acceptedDate = (date: Date) => date.toLocaleString("fr-TN", { timeZone: "Africa/Tunis" });

function signatureLabel(acceptedAt: Date | null, engagementStatus: string, signable: boolean) {
  if (acceptedAt) return "Accepté";
  if (engagementStatus === "CANCELLED") return "Annulé";
  return signable ? "À accepter" : "Expiré";
}

export default async function ContractList({ userId, role }: { userId: number; role: "ADMIN" | "RECRUTEUR" | "TRAVAILLEUR" }) {
  const contracts = await prisma.engagementContract.findMany({
    where: role === "ADMIN" ? {} : {
      party: role,
      engagement: { application: role === "RECRUTEUR" ? { mission: { recruiterId: userId } } : { workerId: userId } },
    },
    include: { engagement: { include: {
      application: { select: {
        status: true,
        worker: { select: { firstName: true, name: true } },
        mission: { select: { status: true, title: true, recruiter: { select: { firstName: true, name: true } } } },
      } },
      contracts: { select: { party: true, acceptedAt: true } },
      payment: { include: { payout: true, refund: true } }, disputes: { orderBy: { id: "desc" } },
    } } },
    orderBy: { engagementId: "desc" },
  });
  const now = new Date();
  function acceptsSignatures(engagement: (typeof contracts)[number]["engagement"]) {
    return engagement.status === "AWAITING_CONTRACTS" && engagement.startAt > now &&
      engagement.application.status === "ACCEPTED" && activeMissionStatuses.includes(engagement.application.mission.status);
  }
  function canAccept(contract: (typeof contracts)[number]) {
    return role === contract.party && !contract.acceptedAt && acceptsSignatures(contract.engagement);
  }
  return <Panel title="Contrats électroniques" description={role === "ADMIN" ? undefined : `${contracts.filter(canAccept).length} contrat(s) à accepter`}>
    <div className="space-y-4 p-6">
      {contracts.length === 0 && <p>Aucun contrat disponible.</p>}
      {contracts.map(contract => {
        const { engagement } = contract;
        const { mission, worker } = engagement.application;
        const { recruiter } = mission;
        const missionLabel = contract.content.split("\n\n")[3] || mission.title;
        const signable = acceptsSignatures(engagement);
        const status = signatureLabel(contract.acceptedAt, engagement.status, signable);
        const openDispute = engagement.disputes.some(dispute => !dispute.resolvedAt);
        const attendanceAllowed = role === "RECRUTEUR" && !!engagement.confirmedAt && !openDispute && engagement.application.status === "ACCEPTED" &&
          activeMissionStatuses.includes(mission.status);
        const checkOut = attendanceAllowed && canCheckOut(engagement);
        const payable = engagement.status === "AWAITING_PAYMENT" && hasValidatedCheckOut(engagement) && !openDispute;
        const awaitingLegacyPayment = engagement.status === "AWAITING_PAYMENT" && !hasValidatedCheckOut(engagement);
        const content = <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{contract.content}</p>;
        const actions = <>
          <a href={`/api/finance/contracts/${contract.reference}?format=pdf`} className="rq-button">Télécharger le PDF</a>
          {canAccept(contract) && <AcceptContract reference={contract.reference} />}
        </>;
        const summary = <>{missionLabel} · {partyLabels[contract.party]} · {status}</>;
        const engagementActions = <>
          <p className="mt-4 text-sm">Engagement · {awaitingLegacyPayment
            ? engagement.payment ? "Vérification administrative requise" : "Check-in requis"
            : engagementLabels[engagement.status] ?? engagement.status}</p>
          {engagement.checkedInAt && <p className="mt-2 text-sm">Arrivée enregistrée le {engagement.checkedInAt.toLocaleString("fr-TN", { timeZone: "Africa/Tunis" })} (Tunis)</p>}
          {engagement.checkedOutAt && <p className="mt-2 text-sm">Départ enregistré le {engagement.checkedOutAt.toLocaleString("fr-TN", { timeZone: "Africa/Tunis" })} (Tunis)</p>}
          {payable && engagement.paymentDueAt && <p className="mt-2 text-sm">Échéance le {engagement.paymentDueAt.toLocaleString("fr-TN", { timeZone: "Africa/Tunis" })} (Tunis){engagement.paymentDueAt < now ? " · En retard" : ""}</p>}
          {(role !== "ADMIN" || contract.party === "RECRUTEUR") && contract.engagement.disputes.map(dispute => <div key={dispute.id} className="my-3 rounded-lg bg-violet-50 p-3 text-sm">
            <p>Litige #{dispute.id} · {dispute.resolvedAt ? "Traité" : "Ouvert"}</p>
            <p className="whitespace-pre-wrap break-words">{dispute.reason}</p>
            {dispute.resolution && <p className="whitespace-pre-wrap break-words">Décision · {dispute.resolution}</p>}
          </div>)}
          {attendanceAllowed && canCheckIn(engagement) && <EngagementActions key="check-in" id={engagement.id} action="check-in" />}
          {checkOut && <EngagementActions key="check-out" id={engagement.id} action="check-out" />}
          {role === "RECRUTEUR" && (contract.engagement.status === "AWAITING_CONTRACTS" ||
            (contract.engagement.status === "CONFIRMED" && contract.engagement.startAt > now)) &&
            <EngagementActions id={contract.engagement.id} action="cancel" />}
          {role !== "ADMIN" && !checkOut && !openDispute && !(engagement.status === "AWAITING_PAYMENT" && engagement.payment) &&
            ["CONFIRMED", "IN_PROGRESS", "AWAITING_VALIDATION", "AWAITING_PAYMENT", "PAID"].includes(engagement.status) &&
            (engagement.checkedInAt || engagement.startAt <= now) &&
            <EngagementActions id={contract.engagement.id} action="dispute" />}
          {role === "ADMIN" && contract.party === "RECRUTEUR" && contract.engagement.status === "DISPUTED" &&
            <EngagementActions id={contract.engagement.id} action="resolve" />}
          {role === "RECRUTEUR" && payable &&
            <StripeCheckout id={contract.engagement.id} amount={new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(stripeTestAmount(contract.engagement.totalMillimes) / 100)} />}
          {role === "RECRUTEUR" && payable && engagement.payment?.status === "FAILED" && <p className="mt-3 text-sm">Paiement refusé. Vous pouvez réessayer.</p>}
          {role !== "TRAVAILLEUR" && contract.engagement.payment && ["SUCCEEDED", "REFUNDED"].includes(contract.engagement.payment.status) &&
            <a className="rq-button mt-3" href={`/api/finance/receipts/${contract.engagement.payment.id}`}>Télécharger le justificatif de test</a>}
          {role === "TRAVAILLEUR" && contract.engagement.payment?.payout && <p className="mt-3 text-sm">
            {contract.engagement.payment.payout.reversedAt ? "Versement simulé annulé après remboursement." : "Versement simulé enregistré dans QuickJob."}
          </p>}
          {contract.engagement.payment?.status === "REFUNDED" && <p className="mt-3 text-sm">Paiement remboursé en mode test.</p>}
          {role === "ADMIN" && contract.party === "RECRUTEUR" && contract.engagement.payment?.refund && <p className="mt-3 text-sm">
            Motif du remboursement · {contract.engagement.payment.refund.reason}
          </p>}
          {role === "ADMIN" && contract.party === "RECRUTEUR" && contract.engagement.payment?.status === "SUCCEEDED" &&
            (!contract.engagement.payment.refund || contract.engagement.payment.refund.status === "REQUESTED") &&
            <RefundForm id={contract.engagement.payment.id} existingReason={contract.engagement.payment.refund?.reason} />}
        </>;
        if (role === "ADMIN") return <details className="rounded-xl border border-violet-100 p-4" key={contract.reference}>
          <summary className="cursor-pointer">{summary}</summary>
          <div className="my-4">{content}</div>
          {contract.acceptedAt && <p className="mb-3 text-sm">Accepté le {acceptedDate(contract.acceptedAt)} (Tunis)</p>}
          <div className="flex flex-wrap gap-2">{actions}</div>
          {engagementActions}
        </details>;
        return <article className="rounded-xl border border-violet-100 p-4" key={contract.reference}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 break-words font-medium">{summary}</p>
            <ContractDialog mission={missionLabel} status={status} actions={actions}>
              {content}
              <section className="mt-6 border-t border-violet-100 pt-4" aria-label="Statut des signatures">
                <h3 className="mb-2 text-sm font-semibold">Signatures</h3>
                <dl className="space-y-2 text-sm">
                  {engagement.contracts.map(signature => {
                    const party = signature.party === "RECRUTEUR" ? recruiter : worker;
                    return <div key={signature.party}>
                      <dt className="font-medium">{partyLabels[signature.party]} · {[party.firstName, party.name].filter(Boolean).join(" ")}</dt>
                      <dd>{signature.acceptedAt
                        ? `Accepté le ${acceptedDate(signature.acceptedAt)} (Tunis)`
                        : signatureLabel(null, engagement.status, signable)}</dd>
                    </div>;
                  })}
                </dl>
              </section>
            </ContractDialog>
          </div>
          {engagementActions}
        </article>;
      })}
    </div>
  </Panel>;
}
