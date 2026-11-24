import { PrismaClient } from "@prisma/client";
import env from "@next/env";

env.loadEnvConfig(process.cwd());
const db = new PrismaClient();
const now = new Date();
const pending = {
  status: "AWAITING_PAYMENT", checkedOutAt: { not: null }, paymentDueAt: { lte: now }, paymentReminderAt: null,
};
let sent = 0;
try {
  const engagements = await db.engagement.findMany({
    where: pending, take: 100, orderBy: { paymentDueAt: "asc" },
    select: { id: true, application: { select: { id: true, mission: { select: { id: true, title: true, recruiterId: true } } } } },
  });
  for (const { id, application } of engagements) {
    sent += await db.$transaction(async tx => {
      const claimed = await tx.engagement.updateMany({ where: { id, ...pending }, data: { paymentReminderAt: now } });
      if (!claimed.count) return 0;
      const { mission } = application;
      await tx.notification.create({ data: {
        userId: mission.recruiterId, kind: "APPLICATION", missionId: mission.id, applicationId: application.id,
        message: `Rappel : l’échéance de paiement pour « ${mission.title} » est dépassée.`,
      } });
      return 1;
    });
  }
  console.log(`${sent} rappel(s) financier(s) enregistré(s).`);
} finally {
  await db.$disconnect();
}
