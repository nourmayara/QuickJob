import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { fail, idSchema, protectedRoute } from "@/lib/api";
import { getFinancialSettings } from "@/lib/financial-settings";
import { closeCompletedMission } from "@/lib/mission-financial-closure";
import { canCheckIn, canCheckOut, hasValidatedCheckOut } from "@/lib/engagement-attendance";

const actionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check-in") }).strict(),
  z.object({ action: z.literal("check-out") }).strict(),
  z.object({ action: z.literal("cancel") }).strict(),
  z.object({ action: z.enum(["dispute", "report-check-out-problem"]), reason: z.string().trim().min(10).max(3000) }).strict(),
  z.object({ action: z.literal("resolve"), decision: z.enum(["RESUME", "NO_WORK"]), reason: z.string().trim().min(10).max(3000) }).strict(),
]);

export const POST = protectedRoute(["TRAVAILLEUR", "RECRUTEUR", "ADMIN"], async (request, context, user) => {
  const id = idSchema.safeParse((await context.params).id);
  const input = actionInput.safeParse(await request.json().catch(() => null));
  if (!id.success || !input.success) return fail(400, "Action ou motif invalide.");
  const command = input.data;
  if ((["check-in", "check-out", "report-check-out-problem", "cancel"].includes(command.action) && user.role !== "RECRUTEUR") ||
      (command.action === "dispute" && user.role === "ADMIN") ||
      (command.action === "resolve" && user.role !== "ADMIN")) return fail(403, "Action interdite.");

  return prisma.$transaction(async tx => {
    const ownership: Prisma.EngagementWhereInput = user.role === "ADMIN" ? {} :
      { application: user.role === "TRAVAILLEUR" ? { workerId: user.id } : { mission: { recruiterId: user.id } } };
    const locked = await tx.engagement.updateMany({ where: { id: id.data, ...ownership }, data: { id: id.data } });
    if (!locked.count) return fail(404, "Engagement introuvable.");
    const engagement = await tx.engagement.findUniqueOrThrow({
      where: { id: id.data },
      include: { application: { include: { mission: true } }, contracts: true, payment: true, disputes: { where: { resolvedAt: null } } },
    });
    const now = new Date();
    const { application, status } = engagement;
    const { mission } = application;
    const update = (data: Prisma.EngagementUpdateInput) => tx.engagement.update({ where: { id: engagement.id }, data });
    const notify = (userId: number, message: string) => tx.notification.create({
      data: { userId, kind: "APPLICATION", applicationId: application.id, missionId: mission.id, message },
    });
    const due = (hours: number) => new Date(now.getTime() + hours * 3_600_000);
    if (command.action === "check-in" || command.action === "check-out") {
      if (application.status !== "ACCEPTED" || !engagement.confirmedAt || engagement.disputes.length ||
          engagement.contracts.length !== 2 || engagement.contracts.some(contract => !contract.acceptedAt) ||
          !["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"].includes(mission.status)) {
        return fail(409, "La mission doit être active, avec les deux contrats acceptés et sans litige ouvert.");
      }
      if (command.action === "check-in") {
        if (!canCheckIn(engagement)) return fail(409, "Le Check-in est indisponible pour cet engagement.");
        await update({
          status: "IN_PROGRESS", checkedInAt: now, completedAt: null, validatedAt: null,
          validationDueAt: null, validationReminderAt: null, paymentDueAt: null, paymentReminderAt: null,
        });
        if (mission.status !== "IN_PROGRESS") {
          await tx.mission.update({ where: { id: mission.id }, data: { status: "IN_PROGRESS" } });
        }
        await notify(application.workerId, `Votre arrivée pour « ${mission.title} » a été confirmée.`);
        return Response.json({ ok: true });
      }
      if (!canCheckOut(engagement)) return fail(409, "Le Check-out nécessite un Check-in enregistré pour cet engagement.");
      const settings = await getFinancialSettings(tx);
      await update({
        status: "AWAITING_PAYMENT", checkedOutAt: now, completedAt: now, validatedAt: now, paymentDueAt: due(settings.paymentHours),
      });
      await closeCompletedMission(tx, mission.id);
      await notify(application.workerId, `Votre Check-out pour « ${mission.title} » a été enregistré et votre travail est validé.`);
      await notify(mission.recruiterId, `Le paiement de « ${mission.title} » est maintenant attendu.`);
    } else if (command.action === "cancel") {
      if (status !== "AWAITING_CONTRACTS" && (status !== "CONFIRMED" || engagement.startAt <= now)) {
        return fail(409, "Cet engagement a commencé. Ouvrez un litige en cas de désaccord.");
      }
      await update({ status: "CANCELLED" });
      await tx.application.update({ where: { id: application.id }, data: {
        status: "CANCELLED", cancelledAt: now, cancelledBy: "RECRUITER", cancelledFromStatus: application.status,
      } });
      if (mission.status === "FULL" && engagement.startAt > now) {
        await tx.mission.update({ where: { id: mission.id }, data: { status: "PUBLISHED" } });
      }
      await closeCompletedMission(tx, mission.id);
      await notify(application.workerId, `Votre engagement pour « ${mission.title} » a été annulé par le recruteur.`);
    } else if (command.action === "dispute" || command.action === "report-check-out-problem") {
      if (command.action === "report-check-out-problem" && !canCheckOut(engagement)) {
        return fail(409, "Le Check-out n’est pas disponible pour cet engagement.");
      }
      if (engagement.payment && status === "AWAITING_PAYMENT") return fail(409, "Une tentative Stripe existe déjà pour cet engagement.");
      if (!["CONFIRMED", "IN_PROGRESS", "AWAITING_VALIDATION", "AWAITING_PAYMENT", "PAID"].includes(status) ||
          (now < engagement.startAt && !engagement.checkedInAt)) {
        return fail(409, "Cet engagement ne permet pas d’ouvrir un litige.");
      }
      await update({ status: "DISPUTED" });
      await tx.engagementDispute.create({ data: {
        engagementId: engagement.id, openedById: user.id, reason: command.reason, previousStatus: status,
      } });
      await notify(user.role === "RECRUTEUR" ? application.workerId : mission.recruiterId, `Un litige est ouvert pour « ${mission.title} ».`);
    } else if (command.action === "resolve") {
      const dispute = engagement.disputes[0];
      if (status !== "DISPUTED" || !dispute) return fail(409, "Aucun litige ouvert.");
      if (command.decision === "NO_WORK" && (hasValidatedCheckOut(engagement) || engagement.payment)) {
        return fail(409, "Le travail a déjà été validé au Check-out ou une tentative de paiement existe.");
      }
      await tx.engagementDispute.update({ where: { id: dispute.id }, data: {
        resolvedAt: now, resolvedById: user.id, decision: command.decision, resolution: command.reason,
      } });
      await update({ status: command.decision === "NO_WORK" ? "CANCELLED" :
        engagement.payment?.status === "REFUNDED" ? "REFUNDED" : dispute.previousStatus });
      await closeCompletedMission(tx, mission.id);
      await notify(application.workerId, `Une décision a été enregistrée pour « ${mission.title} ».`);
      await notify(mission.recruiterId, `Une décision a été enregistrée pour « ${mission.title} ».`);
    }
    return Response.json({ ok: true });
  });
});
