import {lockAdmin} from "./admin-lock";
import "server-only";
import {z} from "zod";
import type {Prisma} from "@prisma/client";
import prisma from "./prisma";
import {RecruiterError} from "./recruiter-service";
const filterDate=z.string().trim().refine(value=>{
 if(!value)return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T00:00:00.000Z`);
 return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
},"Date invalide.").default("");
export const verificationFilter=z.object({
 status:z.enum(["","EN_ATTENTE","APPROUVE","REFUSE"]).default(""),
 q:z.string().trim().max(254).default(""),
 recruiterType:z.enum(["","COMPANY","INDIVIDUAL"]).default(""),
 date:filterDate,
 page:z.coerce.number().int().min(1).max(100000).default(1),
});
export const decisionInput=z.object({status:z.enum(["APPROUVE","REFUSE"]),reason:z.string().trim().max(1000).optional()}).strict().superRefine((value,ctx)=>{if(value.status==="REFUSE"&&!value.reason)ctx.addIssue({code:"custom",path:["reason"],message:"Le motif du refus est obligatoire."});});
export const verificationInclude={user:{select:{id:true,name:true,firstName:true,email:true,phone:true,companyName:true,recruiterType:true,city:true,address:true,sector:true,bio:true,createdAt:true,suspended:true,role:true}},decidedBy:{select:{id:true,name:true,firstName:true}}} as const;
function tunisDayStart(value:string){
 const [year,month,day]=value.split("-").map(Number);
 return new Date(Date.UTC(year,month-1,day)-60*60*1000);
}
function verificationWhere(input:z.infer<typeof verificationFilter>):Prisma.RecruiterVerificationWhereInput{
 const dayStart=input.date?tunisDayStart(input.date):null;
 const searchTerms=input.q.split(/\s+/).filter(Boolean);
 const user:Prisma.UserWhereInput={
  role:"RECRUTEUR",
  ...(searchTerms.length?{AND:searchTerms.map(term=>({OR:[{name:{contains:term}},{firstName:{contains:term}},{companyName:{contains:term}},{email:{contains:term}}]}))}:{}),
  ...(input.recruiterType?{recruiterType:input.recruiterType}:{}),
  ...(dayStart?{createdAt:{gte:dayStart,lt:new Date(dayStart.getTime()+24*60*60*1000)}}:{}),
 };
 return {...(input.status?{status:input.status}:{}),user};
}
export async function countVerifications(input:z.infer<typeof verificationFilter>){
 return prisma.recruiterVerification.count({where:verificationWhere(input)});
}
export async function listVerifications(input:z.infer<typeof verificationFilter>){
 const where=verificationWhere(input);
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
  const notification={
   userId,
   kind:"VERIFICATION",
   message:input.status==="APPROUVE"?"Votre compte Recruteur QuickJob a été approuvé ! Vous pouvez maintenant publier vos missions.":"Votre demande de compte Recruteur a été refusée. Consultez le motif dans votre espace.",
   createdAt:new Date(),
   readAt:null,
  };
  // A pending notification may already own the verification's unique relation.
  // Reuse it for the final decision so the transaction stays atomic and duplicate-free.
  await tx.notification.upsert({where:{verificationId:userId},update:notification,create:{...notification,verificationId:userId}});
  await tx.adminAction.create({data:{adminId,targetType:"USER",targetId:userId,action:"RECRUITER_"+input.status,reason:input.reason||"Approbation du compte recruteur"}});
  return {status:input.status};
 });
}
