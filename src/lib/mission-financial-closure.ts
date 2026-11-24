import "server-only";
import type { Prisma } from "@prisma/client";

export async function closeCompletedMission(tx: Prisma.TransactionClient, missionId: number) {
  const completed: Prisma.EngagementWhereInput = { OR: [
    { status: { in: ["PAID", "REFUNDED"] } },
    { checkedOutAt: { not: null }, status: "AWAITING_PAYMENT" },
  ] };
  await tx.mission.updateMany({
    where: {
      id: missionId, status: { in: ["PUBLISHED", "FULL", "CLOSED", "IN_PROGRESS"] },
      applications: {
        some: { engagement: completed },
        none: { status: "ACCEPTED", OR: [
          { engagement: null },
          { engagement: { status: { not: "CANCELLED" }, NOT: completed } },
        ] },
      },
    },
    data: { status: "COMPLETED" },
  });
}
