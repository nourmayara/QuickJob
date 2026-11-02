import { NextResponse } from "next/server";
import { protectedRoute, fail } from "@/lib/api";
import { missionsFilter } from "@/lib/admin-validation";
import { listAdminMissions } from "@/lib/admin-service";
export const GET = protectedRoute(["ADMIN"], async request => {
  const input = missionsFilter.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return fail(400, "Filtres invalides");
  const result = await listAdminMissions(input.data);
  return NextResponse.json(result.items, { headers: { "Cache-Control": "no-store", "X-Total-Count": String(result.total), "X-Page": String(result.page) } });
});
