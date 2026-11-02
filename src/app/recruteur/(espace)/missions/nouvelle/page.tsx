import { activeCategories } from "@/lib/category-service";
import { requirePageRole } from "@/lib/authorization";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import MissionForm from "@/components/recruiter/MissionForm";
export default async function NewMissionPage() {
  await requirePageRole(["RECRUTEUR"]);
  return <><PageHeading eyebrow="UN NOUVEAU BESOIN" title="Publier une mission" description="Donnez aux bons talents toutes les informations pour vous rejoindre." /><Panel title="Informations de la mission" description="Les champs sont requis, sauf indication contraire."><MissionForm categories={(await activeCategories()).map(c => c.name)} /></Panel></>;
}
