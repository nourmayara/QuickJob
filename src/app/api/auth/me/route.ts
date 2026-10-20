import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authorization";
export async function GET() { const auth = await requireRole(); return auth.response ?? NextResponse.json(auth.user); }
