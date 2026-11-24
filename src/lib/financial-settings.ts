import "server-only";
import { z } from "zod";
import prisma from "./prisma";

export const financialSettingsInput = z.object({
  commissionBps: z.number().int().min(0).max(10_000),
  validationHours: z.number().int().min(1).max(8760).optional(),
  paymentHours: z.number().int().min(1).max(8760),
  revision: z.number().int().nonnegative().max(2_147_483_646),
}).strict();

export function getFinancialSettings(db: Pick<typeof prisma, "financialSettings"> = prisma) {
  return db.financialSettings.findUniqueOrThrow({ where: { id: 1 } });
}

export async function updateFinancialSettings(adminId: number, input: z.infer<typeof financialSettingsInput>) {
  const { revision, ...values } = financialSettingsInput.parse(input);
  return prisma.$transaction(async tx => {
    const locked = await tx.financialSettings.updateMany({ where: { id: 1, revision }, data: { revision } });
    if (!locked.count) return null;
    const admin = await tx.user.findFirst({ where: { id: adminId, role: "ADMIN", suspended: false }, select: { id: true } });
    if (!admin) throw new Error("Administrateur non autorisé");
    const current = await getFinancialSettings(tx);
    const updated = await tx.financialSettings.update({ where: { id: 1 }, data: { ...values, revision: { increment: 1 } } });
    if (current.commissionBps !== values.commissionBps) {
      await tx.commissionRateHistory.create({ data: { previousBps: current.commissionBps, newBps: values.commissionBps, adminId } });
    }
    return updated;
  });
}
