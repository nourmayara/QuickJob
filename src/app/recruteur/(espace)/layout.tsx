import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import RecruiterShell from "@/components/recruiter/RecruiterShell";
export default async function ApprovedRecruiterLayout({children}:{children:React.ReactNode}) {
 const user = await requirePageRole(["RECRUTEUR"]);
 const profile = await prisma.user.findUnique({where:{id:user.id},select:{companyName:true,notifications:{orderBy:{createdAt:"desc"},take:1,select:{id:true,message:true}}}});
 return <RecruiterShell name={`${user.firstName} ${user.name}`.trim()} company={profile?.companyName ?? null}>
  {profile?.notifications.map(notification=><p key={notification.id} role="status" className="rq-success">{notification.message}</p>)}{children}
 </RecruiterShell>;
}
