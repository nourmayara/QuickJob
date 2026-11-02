import { NextResponse } from "next/server";
import { protectedRoute } from "@/lib/api";
import { activeCategories } from "@/lib/category-service";
export const GET = protectedRoute(["TRAVAILLEUR", "RECRUTEUR"], async () => NextResponse.json(await activeCategories(), { headers: { "Cache-Control": "no-store" } }));
