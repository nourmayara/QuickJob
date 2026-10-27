import {requirePageRole} from "@/lib/authorization";
import AdminShell from "@/components/admin/AdminShell";
import "../recruteur/recruiter.css";
import "./admin.css";
import "../premium-dashboard.css";
export const metadata={title:"Vérification des recruteurs | QuickJob",robots:{index:false,follow:false}};
export default async function AdminLayout({children}:{children:React.ReactNode}){await requirePageRole(["ADMIN"]);return <AdminShell>{children}</AdminShell>;}
