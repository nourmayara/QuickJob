import { z } from "zod";
import prisma from "@/lib/prisma";
import { fail, protectedRoute } from "@/lib/api";
import { stripeTestClient } from "@/lib/stripe-test";

const inputSchema = z.object({ paymentId: z.uuid(), reason: z.string().trim().min(10).max(3000) }).strict();

export const POST = protectedRoute(["ADMIN"], async (request, _context, admin) => {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, "Paiement ou motif invalide.");
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) {
    return fail(503, "Configurez Stripe en mode test avant de demander un remboursement.");
  }
  const { paymentId, reason } = input.data;
  const prepared = await prisma.$transaction(async tx => {
    const locked = await tx.engagementPayment.updateMany({ where: { id: paymentId, status: "SUCCEEDED" }, data: { id: paymentId } });
    if (!locked.count) return null;
    const payment = await tx.engagementPayment.findUniqueOrThrow({ where: { id: paymentId }, include: { refund: true } });
    if (!payment.stripeIntentId || (payment.refund && (payment.refund.status !== "REQUESTED" || payment.refund.reason !== reason))) return null;
    const refund = payment.refund ?? await tx.engagementRefund.create({ data: { paymentId, reason, adminId: admin.id } });
    return { amount: payment.stripeAmount, currency: payment.stripeCurrency, intentId: payment.stripeIntentId, refund };
  });
  if (!prepared) return fail(409, "Ce paiement ne permet pas cette demande de remboursement.");
  const { refund, intentId, amount, currency } = prepared;
  if (!refund.stripeRefundId && Date.now() - refund.createdAt.getTime() >= 23 * 3_600_000) {
    return fail(409, "La demande précédente doit être vérifiée dans Stripe.");
  }
  try {
    const stripe = stripeTestClient();
    const result = refund.stripeRefundId ? await stripe.refunds.retrieve(refund.stripeRefundId) :
      await stripe.refunds.create({
        payment_intent: intentId, amount, reason: "requested_by_customer", metadata: { quickJobRefundId: refund.id },
      }, { idempotencyKey: `quickjob-refund-${refund.id}` });
    if (result.amount !== amount || result.currency !== currency || result.metadata?.quickJobRefundId !== refund.id) {
      return fail(409, "Référence de remboursement incohérente.");
    }
    await prisma.engagementRefund.updateMany({ where: { id: refund.id, stripeRefundId: null }, data: { stripeRefundId: result.id } });
    return Response.json({ requested: true }, { status: 202 });
  } catch {
    return fail(503, "Stripe est temporairement indisponible. Réutilisez le même motif pour réessayer.");
  }
});
