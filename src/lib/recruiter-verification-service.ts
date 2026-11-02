import {lockAdmin} from "./admin-lock";
import "server-only";
import {z} from "zod";
import prisma from "./prisma";
import {RecruiterError} from "./recruiter-service";
import {approvalStatuses} from "./recruiter-approval";
export const verificationFilter=z.object({status:z.enum(approvalStatuses).default("EN_ATTENTE"),page:z.coerce.number().int().min(1).max(100000).default(1)});
export const decisionInput=z.object({status:z.enum(["APPROUVE","REFUSE"]),reason:z.string().trim().max(1000).optional()}).strict().superRefine((value,ctx)=>{if(value.status==="REFUSE"&&!value.reason)ctx.addIssue({code:"custom",path:["reason"],message:"Le motif du refus est obligatoire."});});
export const verificationInclude={user:{select:{id:true,name:true,firstName:true,email:true,phone:true,companyName:true,recruiterType:true,city:true,address:true,sector:true,bio:true,createdAt:true,suspended:true,role:true}},decidedBy:{select:{id:true,name:true,firstName:true}}} as const;
export async function listVerifications(input:z.infer<typeof verificationFilter>){
 const where={status:input.status,user:{role:"RECRUTEUR"}};
 const [items,total]=await Promise.all([prisma.recruiterVerification.findMany({where,include:verificationInclude,orderBy:[{requestedAt:"asc"},{userId:"asc"}],take:25,skip:(input.page-1)*25}),prisma.recruiterVerification.count({where})]);
 return {items,total,page:input.page};
}
export async function decideRecruiter(adminId:number,userId:number,input:z.infer<typeof decisionInput>){
 return prisma.$transaction(async tx=>{
  await lockAdmin(tx,adminId);
  // Recheck the actor inside the transaction; the browser never supplies authority.
  const admin=await tx.user.findFirst({where:{id:adminId,role:"ADMIN",suspended:false},select:{id:true}});
  if(!admin)throw new RecruiterError(403,"Décision réservée à un administrateur actif.");
  const verification=await tx.recruiterVerification.findUnique({where:{userId},include:{user:{select:{role:true,suspended:true}}}});
  if(!verification || verification.user.role!=="RECRUTEUR")throw new RecruiterError(404,"Recruteur introuvable.");
  if(verification.status!=="EN_ATTENTE")throw new RecruiterError(409,"Cette demande a déjà été traitée. Actualisez la page.");
  if(verification.user.suspended)throw new RecruiterError(409,"Ce compte est suspendu. Sa vérification ne peut pas être traitée.");
  const updated=await tx.recruiterVerification.updateMany({where:{userId,status:"EN_ATTENTE",user:{role:"RECRUTEUR",suspended:false}},data:{status:input.status,decidedAt:new Date(),decidedById:admin.id,refusalReason:input.status==="REFUSE"?input.reason!:null}});
  if(updated.count!==1)throw new RecruiterError(409,"Une autre décision a déjà été enregistrée.");
  await tx.notification.create({data:{userId,verificationId:userId,message:input.status==="APPROUVE"?"Votre compte Recruteur QuickJob a été approuvé ! Vous pouvez maintenant publier vos missions.":"Votre demande de compte Recruteur a été refusée. Consultez le motif dans votre espace."}});
  await tx.adminAction.create({data:{adminId,targetType:"USER",targetId:userId,action:"RECRUITER_"+input.status,reason:input.reason||"Approbation du compte recruteur"}});
  return {status:input.status};
 });
}
