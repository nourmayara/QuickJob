import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authorization";
import { recruiterApprovalPath } from "@/lib/recruiter-approval";
export async function GET() {
 const auth = await requireRole(["RECRUTEUR"]);
 if(auth.response) return auth.response;
 const status=auth.user.recruiterVerification?.status ?? "EN_ATTENTE";
 return NextResponse.json({status,destination:recruiterApprovalPath(status)},{headers:{"Cache-Control":"no-store"}});
}
