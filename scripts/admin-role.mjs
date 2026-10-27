import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
// Requires trusted server/DB access. Never expose as an API.
const [id, role, confirmation] = process.argv.slice(2);
if (!/^\d+$/.test(id ?? "") || !Number.isSafeInteger(Number(id)) || Number(id) <= 0 || !["ADMIN","RECRUTEUR","TRAVAILLEUR"].includes(role) || confirmation !== "--confirm") {
  console.error("Usage: node scripts/admin-role.mjs USER_ID ADMIN|RECRUTEUR|TRAVAILLEUR --confirm");
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.update({where:{id:Number(id)},data:{role},select:{id:true,role:true}});
    if (role === "RECRUTEUR") await tx.recruiterVerification.upsert({where:{userId:user.id},update:{},create:{userId:user.id,status:"EN_ATTENTE",requestedAt:new Date()}});
    await tx.session.updateMany({where:{userId:user.id},data:{expiresAt:new Date(0)}});
    return user;
  });
  console.log(result);
} finally { await prisma.$disconnect(); }
