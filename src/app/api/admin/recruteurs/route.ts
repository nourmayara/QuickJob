import {NextResponse} from "next/server";
import {protectedRoute,fail} from "@/lib/api";
import {verificationFilter,listVerifications} from "@/lib/recruiter-verification-service";
export const GET=protectedRoute(["ADMIN"],async request=>{
 const input=verificationFilter.safeParse(Object.fromEntries(new URL(request.url).searchParams));
 if(!input.success)return fail(400,"Filtres invalides.");
 return NextResponse.json(await listVerifications(input.data),{headers:{"Cache-Control":"no-store"}});
});
