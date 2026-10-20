import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/authorization";
import { dashboardPath } from "@/lib/roles";
export default async function DashboardPage() { const user = await requirePageRole(); redirect(dashboardPath(user.role)); }
