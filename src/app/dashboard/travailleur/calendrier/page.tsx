import { requirePageRole } from "@/lib/authorization";
import { calendarMonthInput, localParts } from "@/lib/schedule-time";
import { calendarData } from "@/lib/schedule-service";
import { PageHeading } from "@/components/recruiter/ui";
import WorkerCalendar from "@/components/worker/WorkerCalendar";
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const input = calendarMonthInput.safeParse((await searchParams).month ?? localParts(new Date()).date.slice(0, 7));
  const month = input.success ? input.data : localParts(new Date()).date.slice(0, 7);
  return <><PageHeading title="Mon calendrier" description="Disponibilités, indisponibilités, candidatures et missions confirmées réunies dans votre agenda personnel." />{!input.success && <p role="alert" className="rq-error">Mois invalide : affichage du mois courant.</p>}<WorkerCalendar data={await calendarData(user.id, month)} /></>;
}
