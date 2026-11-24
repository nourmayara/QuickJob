import "server-only";
import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { hasValidatedCheckOut } from "./engagement-attendance";
import { calculateEngagementAmounts } from "./financial-amounts";
import { closeCompletedMission } from "./mission-financial-closure";
import { stripeTestAmount, stripeTestCurrency } from "./stripe-test";

export function loadEngagementPayment(tx: Prisma.TransactionClient, id: string) {
  return tx.engagementPayment.findUnique({
    where: { id },
    include: { engagement: { include: {
      application: { select: { missionId: true, status: true, mission: { select: { status: true } } } },
      contracts: { select: { party: true, acceptedAt: true } },
      disputes: { where: { resolvedAt: null }, select: { id: true } },
    } } },
  });
}

type Payment = NonNullable<Awaited<ReturnType<typeof loadEngagementPayment>>>;

export function matchesStripePayment(payment: Payment, intent: Stripe.PaymentIntent) {
  return payment.stripeIntentId === intent.id && intent.livemode === false &&
    intent.metadata.quickJobPaymentId === payment.id &&
    intent.amount === payment.stripeAmount && intent.currency === payment.stripeCurrency;
}

export function canReconcileEngagement(payment: Payment) {
  const { engagement } = payment;
  const { application, contracts } = engagement;
  if (application.status !== "ACCEPTED" ||
      !["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS", "COMPLETED"].includes(application.mission.status) ||
      engagement.disputes.length || contracts.length !== 2 ||
      !["RECRUTEUR", "TRAVAILLEUR"].every(party => contracts.some(contract => contract.party === party && contract.acceptedAt))) {
    return false;
  }
  try {
    const amounts = calculateEngagementAmounts(engagement.workerMillimes, engagement.commissionBps);
    return engagement.currency === "TND" && amounts.totalMillimes === engagement.totalMillimes &&
      amounts.commissionMillimes === engagement.commissionMillimes &&
      payment.stripeAmount === stripeTestAmount(amounts.totalMillimes) && payment.stripeCurrency === stripeTestCurrency;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

export async function applySuccessfulPayment(
  tx: Prisma.TransactionClient, payment: Payment, intent: Stripe.PaymentIntent, paidAt: Date,
) {
  if (!matchesStripePayment(payment, intent) || intent.status !== "succeeded" ||
      intent.amount_received !== payment.stripeAmount) return "STRIPE_MISMATCH";
  if (payment.status === "SUCCEEDED") return "ALREADY_SUCCEEDED";
  if (payment.status === "REFUNDED") return "REFUNDED";
  if (payment.engagement.status !== "AWAITING_PAYMENT" || !hasValidatedCheckOut(payment.engagement)) {
    return "ENGAGEMENT_NOT_PAYABLE";
  }

  const updated = await tx.engagementPayment.updateMany({
    where: { id: payment.id, status: { in: ["PENDING", "FAILED"] }, stripeIntentId: intent.id },
    data: { status: "SUCCEEDED", paidAt },
  });
  if (!updated.count) return "PAYMENT_NOT_ELIGIBLE";
  await tx.simulatedPayout.create({ data: { paymentId: payment.id } });
  await tx.engagement.update({ where: { id: payment.engagementId }, data: { status: "PAID" } });
  await closeCompletedMission(tx, payment.engagement.application.missionId);
  return "SYNCHRONIZED";
}
