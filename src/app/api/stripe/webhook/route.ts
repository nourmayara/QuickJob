import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import { stripeTestClient } from "@/lib/stripe-test";
import { applySuccessfulPayment, loadEngagementPayment, matchesStripePayment } from "@/lib/engagement-payment-success";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret?.startsWith("whsec_")) return new Response(null, { status: 503 });
  if (!signature) return new Response(null, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripeTestClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (event.livemode) return new Response(null, { status: 400 });
  if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
    const stripeRefund = event.data.object;
    const refundId = stripeRefund.metadata?.quickJobRefundId;
    if (!refundId) return Response.json({ received: true });
    try {
      await prisma.$transaction(async tx => {
        const claimed = await tx.$executeRaw`INSERT OR IGNORE INTO "StripeWebhookEvent" ("id", "processedAt") VALUES (${event.id}, ${new Date()})`;
        if (!claimed) return;
        const refund = await tx.engagementRefund.findUnique({ where: { id: refundId }, include: { payment: true } });
        const intentId = typeof stripeRefund.payment_intent === "string" ? stripeRefund.payment_intent : stripeRefund.payment_intent?.id;
        if (!refund || (refund.stripeRefundId && refund.stripeRefundId !== stripeRefund.id) ||
            intentId !== refund.payment.stripeIntentId || stripeRefund.amount !== refund.payment.stripeAmount ||
            stripeRefund.currency !== refund.payment.stripeCurrency) throw new Error("Stripe refund verification failed");
        if (refund.status === "SUCCEEDED") return;
        const status = stripeRefund.status === "succeeded" ? "SUCCEEDED" :
          ["failed", "canceled"].includes(stripeRefund.status ?? "") ? "FAILED" : refund.status;
        const completedAt = status === "SUCCEEDED" ? new Date(event.created * 1000) : undefined;
        await tx.engagementRefund.update({
          where: { id: refundId }, data: { status, stripeRefundId: stripeRefund.id, completedAt },
        });
        if (status !== "SUCCEEDED") return;
        await tx.engagementPayment.update({ where: { id: refund.paymentId }, data: { status: "REFUNDED" } });
        await tx.engagement.updateMany({
          where: { id: refund.payment.engagementId, status: "PAID" }, data: { status: "REFUNDED" },
        });
        await tx.simulatedPayout.update({ where: { paymentId: refund.paymentId }, data: { reversedAt: completedAt } });
      });
    } catch {
      return new Response(null, { status: 500 });
    }
    return Response.json({ received: true });
  }
  if (event.type !== "payment_intent.succeeded" && event.type !== "payment_intent.payment_failed") {
    return Response.json({ received: true });
  }
  const intent = event.data.object;
  const paymentId = intent.metadata.quickJobPaymentId;
  if (!paymentId) return Response.json({ received: true });
  const success = event.type === "payment_intent.succeeded";
  try {
    await prisma.$transaction(async tx => {
      const claimed = await tx.$executeRaw`INSERT OR IGNORE INTO "StripeWebhookEvent" ("id", "processedAt") VALUES (${event.id}, ${new Date()})`;
      if (!claimed) return;
      const payment = await loadEngagementPayment(tx, paymentId);
      if (!payment || !matchesStripePayment(payment, intent)) {
        throw new Error("Stripe event verification failed");
      }
      if (!success) {
        await tx.engagementPayment.updateMany({
          where: { id: paymentId, status: { in: ["PENDING", "FAILED"] } }, data: { status: "FAILED" },
        });
        return;
      }
      const result = await applySuccessfulPayment(tx, payment, intent, new Date(event.created * 1000));
      if (result !== "SYNCHRONIZED" && result !== "ALREADY_SUCCEEDED" && result !== "REFUNDED") {
        throw new Error("Stripe payment could not be applied");
      }
    });
  } catch {
    return new Response(null, { status: 500 });
  }
  return Response.json({ received: true });
}
