import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { categoryKey } from "./category-name";
import { WorkerError } from "./worker-service";
import { lockAdmin } from "./admin-lock";
export async function activeCategories() { return prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }); }
export async function requireActiveCategory(tx: Prisma.TransactionClient, name: string) {
  const key = categoryKey(name);
  const locked = await tx.category.updateMany({ where: { key, active: true }, data: { active: true } });
  if (!locked.count) throw new WorkerError(400, "Cette catégorie n’est pas disponible. Choisissez une catégorie active.");
  return (await tx.category.findUniqueOrThrow({ where: { key }, select: { name: true } })).name;
}
export async function saveCategory(adminId: number, input: { name: string; active: boolean; expectedName?: string; expectedActive?: boolean }, id?: number) {
  return prisma.$transaction(async tx => {
    await lockAdmin(tx, adminId);
    const current = id ? await tx.category.findUnique({ where: { id } }) : null;
    if (id && !current) throw new WorkerError(404, "Catégorie introuvable");
    if (current && (input.expectedName !== current.name || input.expectedActive !== current.active)) throw new WorkerError(409, "La catégorie a été modifiée. Actualisez la page.");
    const key = categoryKey(input.name), name = input.name.trim().replace(/\s+/g, " ");
    const duplicate = await tx.category.findUnique({ where: { key }, select: { id: true } });
    if (duplicate && duplicate.id !== id) throw new WorkerError(409, "Cette catégorie existe déjà");
    const saved = id ? await tx.category.update({ where: { id }, data: { name, key, active: input.active } }) : await tx.category.create({ data: { name, key, active: input.active } });
    if (current && current.name !== name) {
      const variants = (await tx.mission.groupBy({ by: ["category"] })).flatMap(m => m.category && categoryKey(m.category) === current.key ? [m.category] : []);
      if (variants.length) await tx.mission.updateMany({ where: { category: { in: variants } }, data: { category: name } });
    }
    if (!current || current.name !== name || current.active !== input.active) await tx.adminAction.create({ data: { adminId, targetType: "CATEGORY", targetId: saved.id, action: id ? "CATEGORY_UPDATE" : "CATEGORY_CREATE", reason: `${name} · ${input.active ? "active" : "désactivée"}` } });
    return saved;
  });
}
