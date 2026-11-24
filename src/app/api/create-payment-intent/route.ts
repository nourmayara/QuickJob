import { z } from "zod";
import prisma from "@/lib/prisma";
import { fail, protectedRoute } from "@/lib/api";
import { calculateEngagementAmounts } from "@/lib/financial-amounts";
import { stripeTestAmount, stripeTestClient, stripeTestCurrency } from "@/lib/stripe-test";
import { hasValidatedCheckOut } from "@/lib/engagement-attendance";

const paymentInput = z.object({ engagementId: z.number().int().positive().max(2_147_483_647) }).strict();

export const POST = protectedRoute(["RECRUTEUR"], async (request, _context, recruiter) => {
  const input = paymentInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, "Engagement invalide.");
  const id = input.data.engagementId;
  const prepared = await prisma.$transaction(async tx => {
    const locked = await tx.engagement.updateMany({
      where: { id, application: { status: "ACCEPTED", mission: {
        recruiterId: recruiter.id,
        recruiter: { suspended: false, role: "RECRUTEUR", recruiterVerification: { status: "APPROUVE" } },
      } } },
      data: { id },
    });
    if (!locked.count) return { error: fail(404, "Engagement introuvable.") };
    const engagement = await tx.engagement.findUniqueOrThrow({
      where: { id }, include: { contracts: true, payment: true, disputes: { where: { resolvedAt: null }, select: { id: true } } },
    });
    if (engagement.status !== "AWAITING_PAYMENT" || !hasValidatedCheckOut(engagement) || engagement.disputes.length ||
        (engagement.payment && !["PENDING", "FAILED"].includes(engagement.payment.status)) ||
        engagement.contracts.length !== 2 || engagement.contracts.some(contract => !contract.acceptedAt)) {
      return { error: fail(409, "Cet engagement ne peut pas être payé.") };
    }
    const amounts = calculateEngagementAmounts(engagement.workerMillimes, engagement.commissionBps);
    if (engagement.currency !== "TND" || amounts.totalMillimes !== engagement.totalMillimes ||
        amounts.commissionMillimes !== engagement.commissionMillimes) return { error: fail(409, "Montant contractuel incohérent.") };
    const stripeAmount = stripeTestAmount(amounts.totalMillimes);
    if (stripeAmount < 50 || stripeAmount > 99_999_999) return { error: fail(409, "Le total est hors des limites du paiement carte de test en EUR.") };
    if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) {
      return { error: fail(503, "Configurez les clés Stripe et le webhook de test avant de payer.") };
    }
    const payment = engagement.payment ?? await tx.engagementPayment.create({
      data: { engagementId: id, stripeAmount, stripeCurrency: stripeTestCurrency },
    });
    if (payment.stripeAmount !== stripeAmount || payment.stripeCurrency !== stripeTestCurrency) {
      return { error: fail(409, "Montant Stripe incohérent.") };
    }
    return { payment };
  });
  if (prepared.error) return prepared.error;
  const { payment } = prepared;
  if (!payment.stripeIntentId && Date.now() - payment.createdAt.getTime() >= 23 * 3_600_000) {
    return fail(409, "La tentative précédente doit être vérifiée par l’administration.");
  }
  const stripe = stripeTestClient();
  let intent;
  try {
    intent = payment.stripeIntentId ? await stripe.paymentIntents.retrieve(payment.stripeIntentId)
      : await stripe.paymentIntents.create({
        amount: payment.stripeAmount, currency: payment.stripeCurrency, allowed_payment_method_types: ["card"],
        metadata: { quickJobPaymentId: payment.id },
      }, { idempotencyKey: `quickjob-payment-${payment.id}` });
  } catch {
    return fail(503, "Stripe est temporairement indisponible. Réessayez.");
  }
  if (intent.livemode || intent.amount !== payment.stripeAmount || intent.currency !== payment.stripeCurrency ||
      intent.metadata.quickJobPaymentId !== payment.id) return fail(409, "Référence Stripe incohérente.");
  const linked = await prisma.engagementPayment.updateMany({
    where: { id: payment.id, stripeIntentId: null }, data: { stripeIntentId: intent.id },
  });
  if (!linked.count && (await prisma.engagementPayment.findUniqueOrThrow({ where: { id: payment.id } })).stripeIntentId !== intent.id) {
    return fail(409, "Référence Stripe incohérente.");
  }
  if (!intent.client_secret || !["requires_payment_method", "requires_confirmation", "requires_action"].includes(intent.status)) {
    return fail(409, "Cette tentative est en cours de vérification ou terminée.");
  }
  return Response.json({ clientSecret: intent.client_secret, requiresAction: intent.status === "requires_action" }, {
    headers: { "Cache-Control": "private, no-store" },
  });
});
