import { requirePageRole } from "@/lib/authorization";
import MessagesWorkspace from "@/components/communication/MessagesWorkspace";
import { pageNumber } from "@/lib/recruiter-data";
export default async function WorkerMessages({ searchParams }: { searchParams: Promise<{ application?: string; page?: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const params = await searchParams;
  return <MessagesWorkspace user={user} application={params.application} page={pageNumber(params.page)} />;
}
