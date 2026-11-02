import "server-only";
import type { Prisma } from "@prisma/client";
import { WorkerError } from "./worker-service";
export async function lockAdmin(tx: Prisma.TransactionClient, adminId: number) {
  const actor = await tx.user.updateMany({ where: { id: adminId, role: "ADMIN", suspended: false }, data: { id: adminId } });
  if (actor.count !== 1) throw new WorkerError(403, "Action réservée à un administrateur actif");
}
