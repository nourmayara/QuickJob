import prisma from "@/lib/prisma";
import {NextResponse} from "next/server";
import {protectedRoute,fail} from "@/lib/api";
import {verificationFilter,listVerifications} from "@/lib/recruiter-verification-service";
export const GET=protectedRoute(["ADMIN"],async request=>{
 const input=verificationFilter.safeParse(Object.fromEntries(new URL(request.url).searchParams));
 if(!input.success)return fail(400,"Filtres invalides.");
 if(new URL(request.url).searchParams.get("countOnly")==="1")return NextResponse.json({total:await prisma.recruiterVerification.count({where:{status:input.data.status,user:{role:"RECRUTEUR"}}})},{headers:{"Cache-Control":"no-store"}});
 return NextResponse.json(await listVerifications(input.data),{headers:{"Cache-Control":"no-store"}});
});
