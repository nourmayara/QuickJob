import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectedRoute, fail } from "@/lib/api";
import { categoryInput, listInput } from "@/lib/admin-validation";
import { saveCategory } from "@/lib/category-service";
export const GET = protectedRoute(["ADMIN"], async request => {
  const input = listInput.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return fail(400, "Filtres invalides");
  const where = input.data.q ? { name: { contains: input.data.q } } : {};
  const [items, total] = await Promise.all([prisma.category.findMany({ where, orderBy: { name: "asc" }, take: 25, skip: (input.data.page - 1) * 25 }), prisma.category.count({ where })]);
  return NextResponse.json({ items, total, page: input.data.page });
});
export const POST = protectedRoute(["ADMIN"], async (request, _context, admin) => {
  const input = categoryInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return fail(400, input.error.issues[0].message);
  return NextResponse.json(await saveCategory(admin.id, input.data), { status: 201 });
});
