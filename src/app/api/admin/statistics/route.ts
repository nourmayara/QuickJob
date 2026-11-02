import { NextResponse } from "next/server";
import { adminDashboardData } from "@/lib/dashboard-data";
import { protectedRoute } from "@/lib/api";
export const GET = protectedRoute(["ADMIN"], async () => {
  return NextResponse.json(await adminDashboardData(), { headers: { "Cache-Control": "no-store" } });
});
