import prisma from "@/lib/prisma";
import { fail, protectedRoute } from "@/lib/api";
import type { Prisma } from "@prisma/client";
import { electronicContractPdf } from "@/lib/electronic-contract-pdf";

function scope(reference: string, role: string, userId: number): Prisma.EngagementContractWhereInput {
  if (role === "ADMIN") return { reference };
  return {
    reference, party: role,
    engagement: { application: role === "RECRUTEUR" ? { mission: { recruiterId: userId } } : { workerId: userId } },
  };
}

export const GET = protectedRoute(["ADMIN", "RECRUTEUR", "TRAVAILLEUR"], async (request, context, user) => {
  const reference = (await context.params).id ?? "";
  const contract = await prisma.engagementContract.findFirst({
    where: scope(reference, user.role, user.id),
    include: { engagement: { select: { status: true, startAt: true } } },
  });
  if (!contract) return fail(404, "Contrat introuvable.");
  if (new URL(request.url).searchParams.get("format") === "pdf") {
    const status = contract.acceptedAt ? "Accepté" :
      contract.engagement.status === "CANCELLED" ? "Annulé" : contract.engagement.startAt <= new Date() ? "Expiré" : "À accepter";
    return new Response(await electronicContractPdf(contract, status), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contrat-${contract.reference}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  return Response.json(contract, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = protectedRoute(["RECRUTEUR", "TRAVAILLEUR"], async (_request, context, user) => {
  const reference = (await context.params).id ?? "";
  const where = scope(reference, user.role, user.id);
  return prisma.$transaction(async tx => {
    const now = new Date();
    const accepted = await tx.engagementContract.updateMany({
      where: { AND: [where, {
        acceptedAt: null,
        engagement: {
          status: "AWAITING_CONTRACTS", startAt: { gt: now },
          application: { status: "ACCEPTED", mission: { status: { in: ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"] } } },
        },
      }] },
      data: { acceptedAt: now },
    });
    const contract = await tx.engagementContract.findFirst({ where });
    if (!contract) return fail(404, "Contrat introuvable.");
    if (!accepted.count) return fail(409, "Ce contrat ne peut plus être accepté.");
    const confirmed = await tx.engagement.updateMany({
      where: { id: contract.engagementId, status: "AWAITING_CONTRACTS", contracts: { none: { acceptedAt: null } } },
      data: { status: "CONFIRMED", confirmedAt: now },
    });
    if (confirmed.count) {
      const { application } = await tx.engagement.findUniqueOrThrow({
        where: { id: contract.engagementId },
        include: { application: { include: { mission: { select: { title: true, recruiterId: true } } } } },
      });
      await tx.notification.createMany({
        data: [application.workerId, application.mission.recruiterId].map(userId => ({
          userId, kind: "APPLICATION", missionId: application.missionId, applicationId: application.id,
          message: `Les deux contrats pour « ${application.mission.title} » ont été acceptés. L’engagement est confirmé.`,
        })),
      });
    }
    return Response.json({ acceptedAt: now, confirmed: confirmed.count === 1 });
  });
});
