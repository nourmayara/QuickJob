import prisma from "@/lib/prisma";
import { fail, protectedRoute } from "@/lib/api";
import { contractPdf } from "@/lib/contract-pdf";
import { formatDinars } from "@/lib/financial-amounts";

export const GET = protectedRoute(["ADMIN", "RECRUTEUR"], async (_request, context, user) => {
  const id = (await context.params).id ?? "";
  const payment = await prisma.engagementPayment.findFirst({
    where: {
      id, status: { in: ["SUCCEEDED", "REFUNDED"] },
      ...(user.role === "RECRUTEUR" && { engagement: { application: { mission: { recruiterId: user.id } } } }),
    },
    include: { engagement: { include: { application: { include: { mission: { select: { title: true } } } } } } },
  });
  if (!payment?.paidAt || !payment.stripeIntentId) return fail(404, "Justificatif introuvable.");
  const { engagement } = payment;
  const stripeTotal = new Intl.NumberFormat("fr-FR", { style: "currency", currency: payment.stripeCurrency }).format(payment.stripeAmount / 100);
  const content = [
    "QuickJob · Justificatif de paiement en mode test",
    `Mission — ${engagement.application.mission.title}`,
    `Paiement ${id} · Confirmé le ${payment.paidAt.toISOString()}`,
    `Référence Stripe ${payment.stripeIntentId}`,
    payment.status === "REFUNDED" ? "Statut — Remboursé" : "Statut — Payé",
    `Rémunération ${formatDinars(engagement.workerMillimes)}`,
    `Commission ${engagement.commissionBps / 100} % · ${formatDinars(engagement.commissionMillimes)}`,
    `Total contractuel ${formatDinars(engagement.totalMillimes)}`,
    `Montant Stripe test ${stripeTotal}. Simulation de 1 DT pour 1 EUR, arrondie au centime.`,
  ].join("\n\n");
  return new Response(contractPdf(content), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="paiement-${payment.id}.pdf"`,
    "Cache-Control": "private, no-store",
  } });
});
