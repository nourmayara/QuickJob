import { z } from "zod";
import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import { fail, protectedRoute } from "@/lib/api";
import { applySuccessfulPayment, canReconcileEngagement, loadEngagementPayment, matchesStripePayment } from "@/lib/engagement-payment-success";
import { stripeTestClient } from "@/lib/stripe-test";

const inputSchema = z.object({ paymentId: z.uuid() }).strict();

const results = {
  SYNCHRONIZED: [200, "Paiement synchronisé avec Stripe."],
  ALREADY_SUCCEEDED: [200, "Ce paiement est déjà synchronisé."],
  PAYMENT_NOT_FOUND: [404, "Paiement introuvable."],
  NO_STRIPE_REFERENCE: [409, "Aucun PaymentIntent n’est associé à ce paiement."],
  REFUNDED: [409, "Ce paiement a été remboursé."],
  PAYMENT_NOT_ELIGIBLE: [409, "Ce paiement ne peut pas être synchronisé."],
  STRIPE_NOT_SUCCEEDED: [409, "Stripe n’a pas confirmé la réussite de ce paiement."],
  STRIPE_MISMATCH: [409, "Les références, le montant ou la devise ne correspondent pas."],
  STRIPE_CHARGE_INELIGIBLE: [409, "La transaction Stripe est introuvable, remboursée, contestée ou incohérente."],
  ENGAGEMENT_NOT_PAYABLE: [409, "L’engagement ou ses conditions de paiement ne permettent pas la synchronisation."],
  STRIPE_UNAVAILABLE: [503, "Impossible de vérifier ce paiement auprès de Stripe pour le moment."],
} as const;

function sameOrigin(request: Request) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return !!host && !!origin && (!fetchSite || fetchSite === "same-origin") &&
    origin === `${new URL(request.url).protocol}//${host}`;
}

function getChargeDate(intent: Stripe.PaymentIntent) {
  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string" || charge.livemode !== false ||
      charge.payment_intent !== intent.id || charge.status !== "succeeded" || !charge.paid || !charge.captured ||
      charge.amount_captured !== intent.amount_received || charge.currency !== intent.currency ||
      charge.refunded || charge.amount_refunded !== 0 || charge.disputed) return null;
  return new Date(charge.created * 1000);
}

export const POST = protectedRoute(["ADMIN"], async (request, _context, admin) => {
  if (!sameOrigin(request)) return fail(403, "Origine de la requête interdite.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return fail(415, "Le format JSON est requis.");
  }
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, "Identifiant de paiement invalide.");
  const { paymentId } = input.data;
  const reference = await prisma.engagementPayment.findUnique({
    where: { id: paymentId }, select: { status: true, stripeIntentId: true },
  });

  let intent: Stripe.PaymentIntent | undefined;
  if (reference?.stripeIntentId && ["PENDING", "FAILED"].includes(reference.status)) {
    try {
      intent = await stripeTestClient().paymentIntents.retrieve(
        reference.stripeIntentId, { expand: ["latest_charge"] }, { timeout: 10_000, maxNetworkRetries: 0 },
      );
    } catch {
      // The audit below records a stable reason without persisting Stripe error payloads.
    }
  }

  const reason = await prisma.$transaction(async tx => {
    const audit = await tx.stripePaymentReconciliation.create({
      data: { adminId: admin.id, paymentId, stripeIntentId: reference?.stripeIntentId, outcome: "DENIED", reason: "PAYMENT_NOT_FOUND" },
    });
    // This first write takes SQLite's writer lock before inspecting mutable payment state.
    async function reconcile(): Promise<keyof typeof results> {
      const payment = await loadEngagementPayment(tx, paymentId);
      if (!payment) return "PAYMENT_NOT_FOUND";
      if (payment.status === "SUCCEEDED") return "ALREADY_SUCCEEDED";
      if (payment.status === "REFUNDED") return "REFUNDED";
      if (!["PENDING", "FAILED"].includes(payment.status)) return "PAYMENT_NOT_ELIGIBLE";
      if (!payment.stripeIntentId) return "NO_STRIPE_REFERENCE";
      if (payment.stripeIntentId !== reference?.stripeIntentId) return "STRIPE_MISMATCH";
      if (!intent) return "STRIPE_UNAVAILABLE";
      if (intent.status !== "succeeded") return "STRIPE_NOT_SUCCEEDED";
      if (!matchesStripePayment(payment, intent) || intent.amount_received !== payment.stripeAmount) return "STRIPE_MISMATCH";
      if (!canReconcileEngagement(payment)) return "ENGAGEMENT_NOT_PAYABLE";
      const paidAt = getChargeDate(intent);
      if (!paidAt) return "STRIPE_CHARGE_INELIGIBLE";
      return applySuccessfulPayment(tx, payment, intent, paidAt);
    }
    const reason = await reconcile();
    await tx.stripePaymentReconciliation.update({
      where: { id: audit.id },
      data: { reason, outcome: reason === "ALREADY_SUCCEEDED" || reason === "SYNCHRONIZED" ? "SUCCESS" : "DENIED" },
    });
    return reason;
  });
  const [status, message] = results[reason];
  return status === 200 ? Response.json({ message }) : fail(status, message);
});
