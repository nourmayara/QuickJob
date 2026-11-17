"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
type Decision="APPROUVE"|"REFUSE";
export default function RecruiterDecision({userId}:{userId:number}){
 const router=useRouter();const submitting=useRef(false);const [choice,setChoice]=useState<Decision|null>(null);const [reason,setReason]=useState("");const [busy,setBusy]=useState(false);const [completed,setCompleted]=useState<Decision|null>(null);const [error,setError]=useState("");
 async function decide(){
  const decision=choice;if(!decision||submitting.current)return;
  submitting.current=true;setBusy(true);setError("");
  try{
   const response=await fetch(`/api/admin/recruteurs/${userId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:decision,...(decision==="REFUSE"?{reason}:{})})});
   const result=await response.json().catch(()=>({})) as {status?:Decision;error?:string};
   if(!response.ok)throw new Error(result.error??"Décision impossible.");
   setCompleted(result.status??decision);window.dispatchEvent(new Event("quickjob:recruiters"));router.refresh();
  }catch(error){
   submitting.current=false;setBusy(false);setError(error instanceof TypeError?"Connexion au serveur impossible. Réessayez.":error instanceof Error?error.message:"Connexion impossible. Réessayez.");
  }
 }
 if(completed)return <section aria-label="Décision administrateur" style={{marginTop:24}}><p role="status" className="rq-success">Décision enregistrée. Actualisation du statut…</p></section>;
 return <section aria-label="Décision administrateur" style={{marginTop:24}}>{!choice?<div className="rq-detail-actions"><button type="button" className="rq-button rq-primary" onClick={()=>{setError("");setChoice("APPROUVE");}}>Approuver</button><button type="button" className="rq-button rq-danger" onClick={()=>{setError("");setChoice("REFUSE");}}>Refuser</button></div>:<form className="rq-confirm" onSubmit={event=>{event.preventDefault();void decide();}}><h3>{choice==="APPROUVE"?"Approuver ce recruteur ?":"Refuser cette demande ?"}</h3><p>{choice==="APPROUVE"?"Son espace sera activé et une notification lui sera adressée.":"Son espace restera bloqué. Le motif sera visible par le recruteur."}</p>{choice==="REFUSE"&&<label className="qa-reason">Motif du refus<textarea autoFocus required maxLength={1000} value={reason} onChange={event=>setReason(event.target.value)} disabled={busy}/></label>}<div><button type="submit" className="rq-button rq-primary" disabled={busy||(choice==="REFUSE"&&!reason.trim())}>{busy?"Enregistrement…":"Confirmer la décision"}</button><button type="button" className="rq-button rq-secondary" disabled={busy} onClick={()=>{setChoice(null);setError("");}}>Annuler</button></div></form>}{error&&<p role="alert" className="rq-error">{error}</p>}</section>;
}
