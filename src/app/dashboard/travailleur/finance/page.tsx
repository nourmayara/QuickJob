import { requirePageRole } from "@/lib/authorization";
import ContractList from "@/components/finance/ContractList";
import { PageHeading } from "@/components/recruiter/ui";
import FinancialOverview from "@/components/finance/FinancialOverview";

export default async function WorkerFinancePage() {
  const worker = await requirePageRole(["TRAVAILLEUR"]);
  return <>
    <PageHeading title="Mes gains et contrats" description="Consultez les conditions de vos engagements." />
    <FinancialOverview role="TRAVAILLEUR" userId={worker.id} />
    <ContractList role="TRAVAILLEUR" userId={worker.id} />
  </>;
}
