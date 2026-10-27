import CityExperience from "@/components/city/CityExperience";
import { requireRole } from "@/lib/authorization";
import "@/components/city/city.css";

export default async function Home() {
 await requireRole();
 return <CityExperience />;
}
