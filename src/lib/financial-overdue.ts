import "server-only";
import type { Prisma } from "@prisma/client";

export function overduePaymentWhere(recruiterId: number, now: Date): Prisma.EngagementWhereInput {
  return { status: "AWAITING_PAYMENT", checkedOutAt: { not: null }, paymentDueAt: { lt: now }, application: { mission: { recruiterId } } };
}
