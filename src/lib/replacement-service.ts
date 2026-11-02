import "server-only";
import prisma from "./prisma";
import { WorkerError } from "./worker-service";
import { missionInterval } from "./schedule-time";
import { scheduleConflict } from "./schedule-service";
import { recommendReplacementCandidates } from "./matching-service";

export async function proposeReplacement(recruiterId: number, cancelledApplicationId: number, candidateId: number) {
  const eligible = await recommendReplacementCandidates(recruiterId, cancelledApplicationId, 20);
  if (!eligible) throw new WorkerError(404, "Annulation éligible introuvable");
  if (!eligible.some(candidate => candidate.worker.id === candidateId)) throw new WorkerError(409, "Ce candidat n’est plus disponible ou éligible");
  return prisma.$transaction(async tx => {
    const cancelled = await tx.application.findFirst({ where: { id: cancelledApplicationId, status: "CANCELLED", cancelledBy: "WORKER", cancelledFromStatus: "ACCEPTED", mission: { recruiterId } }, select: { missionId: true, mission: { select: { title: true } } } });
    if (!cancelled) throw new WorkerError(404, "Annulation introuvable");
    if (await tx.replacementOffer.findFirst({ where: { cancelledApplicationId, status: "PENDING" }, select: { id: true } })) throw new WorkerError(409, "Une proposition de remplacement est déjà en attente");
    let application = await tx.application.findUnique({ where: { missionId_workerId: { missionId: cancelled.missionId, workerId: candidateId } } });
    const createdApplication = !application;
    if (application?.status === "ACCEPTED") throw new WorkerError(409, "Ce candidat participe déjà à la mission");
    if (application && await tx.replacementOffer.findUnique({ where: { applicationId: application.id }, select: { id: true } })) throw new WorkerError(409, "Une proposition existe déjà pour cette candidature");
    application = application
      ? await tx.application.update({ where: { id: application.id }, data: { status: "PENDING", cancelledBy: null, cancelledAt: null, cancelledFromStatus: null } })
      : await tx.application.create({ data: { missionId: cancelled.missionId, workerId: candidateId, status: "PENDING", message: "Proposition de remplacement du recruteur." } });
    const offer = await tx.replacementOffer.create({ data: { missionId: cancelled.missionId, cancelledApplicationId, applicationId: application.id, createdApplication, expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) } });
    await tx.notification.create({ data: { userId: candidateId, kind: "APPLICATION", applicationId: application.id, missionId: cancelled.missionId, message: `Un recruteur vous propose de remplacer un travailleur pour « ${cancelled.mission.title} ». Répondez sous 48 heures.` } });
    return offer;
  });
}

export async function respondToReplacement(workerId: number, offerId: number, decision: "ACCEPTED" | "DECLINED") {
  const result = await prisma.$transaction(async tx => {
    const offer = await tx.replacementOffer.findFirst({ where: { id: offerId, status: "PENDING", application: { workerId } }, include: { application: true, mission: true } });
    if (!offer) throw new WorkerError(404, "Proposition introuvable");
    if (offer.expiresAt <= new Date()) { await tx.replacementOffer.update({ where: { id: offer.id }, data: { status: "EXPIRED", respondedAt: new Date() } }); return { status: "EXPIRED" as const }; }
    if (decision === "DECLINED") {
      await tx.replacementOffer.update({ where: { id: offer.id }, data: { status: "DECLINED", respondedAt: new Date() } });
      if (offer.createdApplication) await tx.application.update({ where: { id: offer.applicationId }, data: { status: "CANCELLED", cancelledBy: "WORKER", cancelledAt: new Date(), cancelledFromStatus: "PENDING" } });
      await tx.notification.create({ data: { userId: offer.mission.recruiterId, kind: "APPLICATION", applicationId: offer.applicationId, missionId: offer.missionId, message: `La proposition de remplacement pour « ${offer.mission.title} » a été refusée.` } });
      return { status: decision };
    }
    const locked = await tx.mission.updateMany({ where: { id: offer.missionId, status: "PUBLISHED" }, data: { id: offer.missionId } });
    if (!locked.count) throw new WorkerError(409, "La mission n’est plus ouverte au remplacement");
    const range = missionInterval(offer.mission);
    if (!range) throw new WorkerError(409, "Le créneau de la mission est incomplet");
    const conflict = await scheduleConflict(tx, workerId, range, offer.missionId);
    if (conflict) throw new WorkerError(409, conflict);
    const occupied = await tx.application.count({ where: { missionId: offer.missionId, status: "ACCEPTED" } });
    if (occupied >= offer.mission.capacity) throw new WorkerError(409, "La place a déjà été pourvue");
    await tx.application.update({ where: { id: offer.applicationId }, data: { status: "ACCEPTED" } });
    await tx.replacementOffer.update({ where: { id: offer.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
    await tx.replacementOffer.updateMany({ where: { cancelledApplicationId: offer.cancelledApplicationId, id: { not: offer.id }, status: "PENDING" }, data: { status: "CANCELLED", respondedAt: new Date() } });
    if (occupied + 1 >= offer.mission.capacity) await tx.mission.update({ where: { id: offer.missionId }, data: { status: "FULL" } });
    await tx.notification.createMany({ data: [
      { userId: workerId, kind: "APPLICATION", applicationId: offer.applicationId, missionId: offer.missionId, message: `Vous avez accepté le remplacement pour « ${offer.mission.title} ». Votre participation est confirmée.` },
      { userId: offer.mission.recruiterId, kind: "APPLICATION", applicationId: offer.applicationId, missionId: offer.missionId, message: `Le remplacement pour « ${offer.mission.title} » a été accepté. La place est confirmée.` },
    ] });
    return { status: decision };
  });
  if (result.status === "EXPIRED") throw new WorkerError(409, "Cette proposition a expiré");
  return result;
}
