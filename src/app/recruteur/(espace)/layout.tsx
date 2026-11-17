import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
export default async function ApprovedRecruiterLayout({children}:{children:React.ReactNode}) {
 const user = await requirePageRole(["RECRUTEUR"]);
 const profile = await prisma.user.findUnique({where:{id:user.id},select:{companyName:true}});
 return <RecruiterShell name={`${user.firstName} ${user.name}`.trim()} company={profile?.companyName ?? null}>
  {children}
 </RecruiterShell>;
}
