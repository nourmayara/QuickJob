import { NextResponse } from "next/server";
import { protectedRoute, fail } from "@/lib/api";
import { reportsFilter } from "@/lib/admin-validation";
import { listReports } from "@/lib/admin-service";
export const GET = protectedRoute(["ADMIN"], async request => {
  const input = reportsFilter.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return fail(400, "Filtres invalides");
  return NextResponse.json(await listReports(input.data));
});
