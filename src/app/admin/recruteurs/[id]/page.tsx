import AdminHistory from "@/components/admin/AdminHistory";
import Link from "next/link";
import {notFound} from "next/navigation";
import prisma from "@/lib/prisma";
import {requirePageRole} from "@/lib/authorization";
import {verificationInclude} from "@/lib/recruiter-verification-service";
import {approvalLabels} from "@/lib/recruiter-approval";
import {PageHeading,Panel,formatDate} from "@/components/recruiter/ui";
import RecruiterDecision from "@/components/admin/RecruiterDecision";
export default async function RecruiterDetail({params}:{params:Promise<{id:string}>}){
 await requirePageRole(["ADMIN"]);const id=Number((await params).id);if(!Number.isSafeInteger(id)||id<=0)notFound();
 const item=await prisma.recruiterVerification.findFirst({where:{userId:id,user:{role:"RECRUTEUR"}},include:verificationInclude});if(!item)notFound();
 const fields=[["Nom",`${item.user.firstName} ${item.user.name}`],["Organisation",item.user.companyName||"Particulier"],["Email",item.user.email],["Téléphone",item.user.phone],["Adresse",item.user.address],["Ville",item.user.city],["Secteur",item.user.sector],["Date d’inscription",formatDate(item.user.createdAt)],["Demande de vérification",item.requestedAt?formatDate(item.requestedAt):"Accès historique"],["Statut du compte",item.user.suspended?"Suspendu":"Actif"]];
 return <><PageHeading title="Informations du recruteur" description="Consultez les informations déclarées avant de prendre votre décision." action={<Link className="rq-button rq-secondary" href="/admin/recruteurs">Retour à la liste</Link>}/><Panel title={`${item.user.firstName} ${item.user.name}`} action={<span className={`qa-badge ${item.status}`}>{approvalLabels[item.status]}</span>}><div className="rq-detail"><dl className="rq-detail-grid">{fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd className="qa-long-text">{value||"Non renseigné"}</dd></div>)}</dl>{item.user.bio&&<p className="qa-long-text">{item.user.bio}</p>}{item.legacy&&<p className="rq-success">Accès historique conservé lors de la transition. Aucune décision administrative fictive n’a été enregistrée.</p>}{item.decidedAt&&<p>Décision du {formatDate(item.decidedAt)} par {item.decidedBy?`${item.decidedBy.firstName} ${item.decidedBy.name}`:"un administrateur supprimé"}.</p>}{item.refusalReason&&<div className="rq-error"><strong>Motif du refus</strong><p className="qa-long-text">{item.refusalReason}</p></div>}{item.status==="EN_ATTENTE"&&!item.user.suspended&&<RecruiterDecision userId={id}/>} {item.user.suspended&&<p className="rq-error">Compte suspendu : accès bloqué et décision indisponible.</p>}</div></Panel><AdminHistory type="USER" id={id} /></>;
}
