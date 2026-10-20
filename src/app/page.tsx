import CityExperience from "@/components/city/CityExperience";
import { requireRole } from "@/lib/authorization";
import "@/components/city/city.css";

export default async function Home() {
 const { user } = await requireRole();
 return <CityExperience role={user?.role ?? null} />;
}
