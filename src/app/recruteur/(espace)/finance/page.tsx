import { requirePageRole } from "@/lib/authorization";
import ContractList from "@/components/finance/ContractList";
import { PageHeading } from "@/components/recruiter/ui";
import FinancialOverview from "@/components/finance/FinancialOverview";

export default async function RecruiterFinancePage() {
  const recruiter = await requirePageRole(["RECRUTEUR"]);
  return <>
    <PageHeading title="Paiements et contrats" description="Consultez les conditions de vos engagements." />
    <FinancialOverview role="RECRUTEUR" userId={recruiter.id} />
    <ContractList role="RECRUTEUR" userId={recruiter.id} />
  </>;
}
