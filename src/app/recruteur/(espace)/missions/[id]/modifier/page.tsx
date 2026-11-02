import { activeCategories } from "@/lib/category-service";
import { notFound } from "next/navigation";
import { ownedMission } from "@/lib/recruiter-data";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import MissionForm from "@/components/recruiter/MissionForm";
export default async function EditMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const m = await ownedMission((await params).id);
  if (!["DRAFT", "PUBLISHED", "FULL"].includes(m.status)) notFound();
  return <><PageHeading eyebrow={`MISSION #${m.id}`} title="Modifier la mission" description="Gardez vos informations à jour pour vos candidats." /><Panel title="Informations de la mission"><MissionForm categories={(await activeCategories()).map(c => c.name)} mission={{ id: m.id, title: m.title, description: m.description, category: m.category, city: m.city, address: m.address, date: m.date?.toISOString().slice(0, 10) || "", startTime: m.startTime, endTime: m.endTime, pay: m.pay, capacity: m.capacity, skills: m.skills, experience: m.experience, status: m.status }} /></Panel></>;
}
