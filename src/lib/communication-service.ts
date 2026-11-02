import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { WorkerError } from "./worker-service";
import { missionInterval } from "./schedule-time";

export type CommunicationActor = { id: number; role: string };
export function participantWhere(user: CommunicationActor): Prisma.ApplicationWhereInput {
  return user.role === "TRAVAILLEUR" ? { workerId: user.id } : { mission: { recruiterId: user.id } };
}
export async function participantApplication(db: Prisma.TransactionClient, user: CommunicationActor, id: number) {
  const application = await db.application.findFirst({ where: { id, ...participantWhere(user) }, select: { id: true, workerId: true, status: true, mission: { select: { id: true, title: true, recruiterId: true, status: true, date: true, startTime: true, endTime: true, recruiter: { select: { name: true, firstName: true, suspended: true, role: true, recruiterVerification: { select: { status: true } } } } } }, worker: { select: { name: true, firstName: true } } } });
  if (!application) throw new WorkerError(404, "Candidature introuvable");
  if (application.status !== "ACCEPTED") throw new WorkerError(403, "Une candidature acceptée est requise");
  const recruiter = application.mission.recruiter;
  if (recruiter.suspended || recruiter.role !== "RECRUTEUR" || recruiter.recruiterVerification?.status !== "APPROUVE") throw new WorkerError(403, "Le recruteur doit être actif et approuvé");
  return application;
}
// Deduplicate reads during one server render; transaction checks stay uncached.
const readParticipant = cache((userId: number, role: string, id: number) => participantApplication(prisma, { id: userId, role }, id));
export function threadApplication(user: CommunicationActor, id: number) {
  return readParticipant(user.id, user.role, id);
}
export async function threadMessages(user: CommunicationActor, id: number, before?: number) {
  await threadApplication(user, id);
  const rows = await prisma.message.findMany({ where: { applicationId: id, ...(before ? { id: { lt: before } } : {}) }, select: { id: true, senderId: true, body: true, createdAt: true, readAt: true }, orderBy: { id: "desc" }, take: 51 });
  return { messages: rows.slice(0, 50).reverse(), hasOlder: rows.length > 50 };
}
export async function sendMessage(user: CommunicationActor, id: number, body: string) {
  return prisma.$transaction(async tx => {
    // Serialize sends with withdrawals, decisions and mission changes on SQLite.
    await tx.application.updateMany({ where: { id, ...participantWhere(user) }, data: { id } });
    const application = await participantApplication(tx, user, id);
    const message = await tx.message.create({ data: { applicationId: id, senderId: user.id, body }, select: { id: true, senderId: true, body: true, createdAt: true, readAt: true } });
    const recipientId = user.id === application.workerId ? application.mission.recruiterId : application.workerId;
    await tx.notification.create({ data: { userId: recipientId, kind: "MESSAGE", applicationId: id, missionId: application.mission.id, message: `Nouveau message concernant « ${application.mission.title} ».` } });
    return message;
  });
}
export function reviewEligibility(application: Awaited<ReturnType<typeof participantApplication>>) {
  const interval = missionInterval(application.mission);
  return application.mission.status === "COMPLETED" && !!interval && interval.endAt <= new Date();
}
export async function reviewData(user: CommunicationActor, id: number) {
  const application = await participantApplication(prisma, user, id);
  const recipientId = user.id === application.workerId ? application.mission.recruiterId : application.workerId;
  const target = user.id === application.workerId ? application.mission.recruiter : application.worker;
  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({ where: { missionId: application.mission.id, OR: [{ authorId: user.id, recipientId }, { authorId: recipientId, recipientId: user.id }] }, select: { id: true, authorId: true, rating: true, comment: true, createdAt: true }, orderBy: { id: "asc" } }),
    prisma.review.aggregate({ where: { recipientId }, _avg: { rating: true }, _count: { rating: true } }),
  ]);
  return { recipientId, recipientName: `${target.firstName} ${target.name}`.trim(), average: aggregate._avg.rating, count: aggregate._count.rating, reviews, canReview: reviewEligibility(application) && !reviews.some(r => r.authorId === user.id) };
}
export async function createReview(user: CommunicationActor, id: number, input: { rating: number; comment: string }) {
  return prisma.$transaction(async tx => {
    await tx.application.updateMany({ where: { id, ...participantWhere(user) }, data: { id } });
    const application = await participantApplication(tx, user, id);
    if (!reviewEligibility(application)) throw new WorkerError(409, "Vous pouvez évaluer uniquement une mission terminée dont l’horaire de fin est passé");
    const recipientId = user.id === application.workerId ? application.mission.recruiterId : application.workerId;
    if (await tx.review.findUnique({ where: { authorId_recipientId_missionId: { authorId: user.id, recipientId, missionId: application.mission.id } }, select: { id: true } })) throw new WorkerError(409, "Vous avez déjà évalué ce participant pour cette mission");
    return tx.review.create({ data: { ...input, authorId: user.id, recipientId, missionId: application.mission.id }, select: { id: true, authorId: true, recipientId: true, rating: true, comment: true, createdAt: true } });
  });
}
