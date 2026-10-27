import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { EmptyState, PageHeading, Panel } from "@/components/recruiter/ui";
export default async function MessagesPage() {
  await requirePageRole(["RECRUTEUR"]);
  return <><PageHeading eyebrow="RESTEZ EN CONTACT" title="Messages" description="Votre futur espace d’échange avec les travailleurs sélectionnés." /><Panel title="Messagerie"><EmptyState icon="mail" title="La messagerie arrive prochainement" action={<Link className="rq-button" href="/recruteur/travailleurs">Voir les travailleurs sélectionnés</Link>}>Les échanges après acceptation d’une candidature sont prévus dans l’US28. L’envoi et la réception de messages ne sont pas encore disponibles.</EmptyState></Panel></>;
}
