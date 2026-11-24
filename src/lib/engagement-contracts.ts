import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { calculateEngagementAmounts, formatDinars } from "./financial-amounts";
import { getFinancialSettings } from "./financial-settings";
import { missionInterval, localParts } from "./schedule-time";

export async function generateEngagement(tx: Prisma.TransactionClient, applicationId: number) {
  const existing = await tx.engagement.findUnique({ where: { applicationId } });
  if (existing) return null;
  const { mission, worker } = await tx.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      mission: { include: { recruiter: { select: { name: true, firstName: true, companyName: true, email: true } } } },
      worker: { select: { name: true, firstName: true, email: true } },
    },
  });
  const interval = missionInterval(mission);
  if (!interval || interval.startAt <= new Date() || mission.pay === null) return null;
  const { commissionBps } = await getFinancialSettings(tx);
  const amounts = calculateEngagementAmounts(Math.round(mission.pay * 1000), commissionBps);
  const day = localParts(interval.startAt).date;
  return tx.engagement.create({
    data: {
      applicationId, commissionBps, ...amounts, ...interval,
      contracts: { create: (["RECRUTEUR", "TRAVAILLEUR"] as const).map(party => {
        const reference = randomUUID();
        const actor = party === "RECRUTEUR" ? mission.recruiter : worker;
        const lines = [
          "QuickJob · Contrat électronique de démonstration",
          `Référence ${reference}`,
          `Parties — QuickJob et ${actor.firstName} ${actor.name} (${actor.email}) · ${party}`,
          `Mission #${mission.id} — ${mission.title}`,
          mission.description,
          `Lieu — ${[mission.address, mission.city].filter(Boolean).join(", ")}`,
          `${day}, de ${mission.startTime} à ${mission.endTime} (heure de Tunis)`,
          `Rémunération du travailleur — ${formatDinars(amounts.workerMillimes)}`,
          `Taux contractuel — ${commissionBps / 100} %`,
          party === "RECRUTEUR"
            ? `Frais de service — ${formatDinars(amounts.commissionMillimes)}. Total recruteur — ${formatDinars(amounts.totalMillimes)}.`
            : "Les frais de service sont à la charge du recruteur. Le travailleur reçoit l’intégralité de la rémunération convenue.",
          "QuickJob coordonne l’engagement. Le travailleur réalise les tâches convenues. Le recruteur confirme son arrivée au Check-in, puis confirme au Check-out que la mission est terminée et que le travail a été correctement réalisé.",
          "Une annulation avant réalisation ou une absence sans prestation ne donne lieu à aucun paiement. Un désaccord ou une prestation partielle peut faire l'objet d'un litige.",
          "Le Check-out valide le travail et autorise le recruteur à régler le montant convenu avec Stripe. Le versement au travailleur est simulé dans QuickJob.",
        ];
        return { party, reference, content: lines.join("\n\n") };
      }) },
    },
  });
}
