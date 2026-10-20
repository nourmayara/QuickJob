import Link from "next/link";
export default function NotFound() {
  return <div className="rq-panel rq-error-page"><h1>Élément introuvable</h1><p className="rq-subtle" style={{ marginTop: 12, marginBottom: 24 }}>Cet élément n’existe pas ou n’est pas accessible depuis votre compte.</p><Link className="rq-button rq-primary" href="/recruteur/dashboard">Retour au tableau de bord</Link></div>;
}
