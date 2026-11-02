import { NextResponse } from "next/server";
import { protectedRoute, fail } from "@/lib/api";
import { calendarMonthInput, localParts } from "@/lib/schedule-time";
import { calendarData } from "@/lib/schedule-service";
export const GET = protectedRoute(["TRAVAILLEUR"], async (request, _context, user) => {
  const month = calendarMonthInput.safeParse(new URL(request.url).searchParams.get("month") ?? localParts(new Date()).date.slice(0, 7));
  if (!month.success) return fail(400, "Mois invalide");
  return NextResponse.json(await calendarData(user.id, month.data), { headers: { "Cache-Control": "no-store" } });
});
