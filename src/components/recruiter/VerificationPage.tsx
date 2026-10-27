import Link from "next/link";
import {redirect} from "next/navigation";
import {requirePageRole} from "@/lib/authorization";
import prisma from "@/lib/prisma";
import {recruiterApprovalPath} from "@/lib/recruiter-approval";
import QuickJobLogo from "@/components/QuickJobLogo";
import LogoutButton from "@/components/LogoutButton";
import Icon from "./Icon";
import VerificationRefresh from "./VerificationRefresh";
import "./verification.css";
export default async function VerificationPage({refused=false}:{refused?:boolean}) {
 const user=await requirePageRole(["RECRUTEUR"],{allowUnapprovedRecruiter:true});
 const verification=await prisma.recruiterVerification.findUnique({where:{userId:user.id},include:{notification:true}});
 const status=verification?.status??"EN_ATTENTE";
 if(status==="APPROUVE" || (status==="REFUSE")!==refused) redirect(recruiterApprovalPath(status));
 return <main className="qv-page"><div className="qv-ambient" aria-hidden="true"><i/><i/><i/></div><article className="qv-card">
  <Link href="/" aria-label="QuickJob, accueil" className="qv-logo"><QuickJobLogo /></Link>
  <p className="qv-eyebrow">ESPACE RECRUTEUR</p>
  <span className={`qv-icon ${refused?"is-refused":"is-waiting"}`}><i aria-hidden="true"/><Icon name={refused?"close":"check"} size={28}/></span>
  <span className={`qv-badge ${refused?"is-refused":""}`}>{refused?"Demande refusée":"En attente de validation"}</span>
  <h1>{refused?"Votre demande n’a pas été approuvée":"Votre compte est en cours de vérification"}</h1>
  <p>{refused?"Votre espace Recruteur reste désactivé. Consultez ci-dessous le motif communiqué par notre équipe.":"Merci d'avoir rejoint QuickJob ! Votre demande de compte Recruteur a bien été reçue. Notre équipe vérifie vos informations avant d'activer votre espace."}</p>
  {refused?<section className="qv-reason"><h2>Motif du refus</h2><p>{verification?.refusalReason??"Veuillez contacter l’administrateur pour plus d’informations."}</p></section>:<ol className="qv-steps"><li><span>✓</span><div><strong>Compte créé</strong><small>Terminé</small></div></li><li aria-current="step"><span>2</span><div><strong>Vérification par l’administrateur</strong><small>En cours</small></div></li><li><span>3</span><div><strong>Activation de votre espace</strong><small>À venir</small></div></li></ol>}
  {verification?.notification&&<p role="status" className="qv-notification">{verification.notification.message}</p>}
  {!refused&&<p className="qv-note">Vous pourrez publier vos missions dès l’approbation de votre compte.</p>}
  <div className="qv-actions">{!refused&&<VerificationRefresh/>}<Link className="rq-button rq-secondary" href="/">Retour à l’accueil</Link><LogoutButton/></div>
 </article></main>;
}
