"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function VerificationRefresh() {
 const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function refresh(){setBusy(true);setError("");setMessage("");try{
  const response=await fetch("/api/recruteur/verification",{cache:"no-store"});
  if(response.status===401){router.replace("/login");router.refresh();return;}
  const result=await response.json();if(!response.ok)throw new Error(result.error??"Vérification impossible.");
  const destinations:Record<string,string>={APPROUVE:"/recruteur/dashboard",REFUSE:"/recruteur/refuse"};
  if(destinations[result.status]){router.replace(destinations[result.status]);router.refresh();}else{setMessage("Votre demande est toujours en cours de vérification.");router.refresh();}
 }catch{setError("Impossible d’actualiser votre statut. Vérifiez votre connexion et réessayez.");}finally{setBusy(false);}}
 return <div><button type="button" className="rq-button rq-primary" onClick={refresh} disabled={busy}>{busy?"Vérification…":"Actualiser mon statut"}</button>{message&&<p role="status" className="qv-feedback">{message}</p>}{error&&<p role="alert" className="rq-error">{error}</p>}</div>;
}
