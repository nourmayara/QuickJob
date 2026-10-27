import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import {protectedRoute,fail,idSchema} from "@/lib/api";
import {decisionInput,decideRecruiter,verificationInclude} from "@/lib/recruiter-verification-service";
export const GET=protectedRoute(["ADMIN"],async(_request,context)=>{
 const id=idSchema.safeParse((await context.params).id);if(!id.success)return fail(400,"Identifiant invalide.");
 const item=await prisma.recruiterVerification.findFirst({where:{userId:id.data,user:{role:"RECRUTEUR"}},include:verificationInclude});
 return item?NextResponse.json(item,{headers:{"Cache-Control":"no-store"}}):fail(404,"Recruteur introuvable.");
});
export const PATCH=protectedRoute(["ADMIN"],async(request,context,admin)=>{
 const id=idSchema.safeParse((await context.params).id),input=decisionInput.safeParse(await request.json().catch(()=>null));
 if(!id.success)return fail(400,"Identifiant invalide.");
 if(!input.success)return fail(400,input.error.issues[0].message);
 return NextResponse.json(await decideRecruiter(admin.id,id.data,input.data));
});
