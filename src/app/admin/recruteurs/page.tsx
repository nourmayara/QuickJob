import Link from "next/link";
import {requirePageRole} from "@/lib/authorization";
import {listVerifications,verificationFilter} from "@/lib/recruiter-verification-service";
import {approvalStatuses,approvalLabels} from "@/lib/recruiter-approval";
import {PageHeading,Panel,formatDate} from "@/components/recruiter/ui";
export default async function Recruiters({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 await requirePageRole(["ADMIN"]);
 const parsed=verificationFilter.safeParse(await searchParams);const input=parsed.success?parsed.data:{status:"EN_ATTENTE" as const,page:1};
 const {items,total}=await listVerifications(input);
 return <><PageHeading eyebrow="ADMINISTRATION" title="Vérification des recruteurs" description="Examinez les demandes et activez les comptes après vérification de leurs informations."/>
  <nav className="qa-filters" aria-label="Statut des vérifications">{approvalStatuses.map(status=><Link key={status} href={`/admin/recruteurs?status=${status}`} aria-current={input.status===status?"page":undefined}>{approvalLabels[status]}</Link>)}</nav>
  <Panel title={`${total} recruteur${total!==1?"s":""}`} description="Les comptes historiques conservent leur accès ; aucune décision administrative ne leur est attribuée.">
   {items.length?<div className="qa-table"><table><thead><tr>{["Recruteur","Organisation","Email","Téléphone","Inscription","Statut","Actions"].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.userId}><td>{item.user.firstName} {item.user.name}{item.user.suspended&&<small>Compte suspendu</small>}</td><td>{item.user.companyName||"Particulier"}</td><td>{item.user.email}</td><td>{item.user.phone||"Non renseigné"}</td><td>{formatDate(item.user.createdAt)}</td><td><span className={`qa-badge ${item.status}`}>{approvalLabels[item.status]}</span>{item.legacy&&<small>Accès historique conservé</small>}</td><td><Link className="rq-link" href={`/admin/recruteurs/${item.userId}`}>Consulter</Link></td></tr>)}</tbody></table></div>:<div className="qa-empty">Aucun recruteur dans cette catégorie.</div>}
   <nav className="qa-pagination" aria-label="Pagination">{input.page>1?<Link href={`/admin/recruteurs?status=${input.status}&page=${input.page-1}`}>Précédent</Link>:<span/>}<span>Page {input.page}</span>{input.page*25<total?<Link href={`/admin/recruteurs?status=${input.status}&page=${input.page+1}`}>Suivant</Link>:<span/>}</nav>
  </Panel></>;
}
