import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/authorization";
import LogoutButton from "@/components/LogoutButton";
import AuthShell from "@/components/auth/AuthShell";
import AdminShell from "@/components/admin/AdminShell";
import AdminDashboard from "@/components/admin/AdminDashboard";
import "../../recruteur/recruiter.css";
import "../../premium-dashboard.css";
export default async function RoleDashboard({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const roles = { travailleur: "TRAVAILLEUR", recruteur: "RECRUTEUR", administrateur: "ADMIN" } as const;
  if (!(role in roles)) notFound();
  const user = await requirePageRole([roles[role as keyof typeof roles]]);
  if (user.role === "ADMIN") return <AdminShell><AdminDashboard name={user.firstName || user.name} /></AdminShell>;
  if (user.role === "RECRUTEUR") redirect("/recruteur/dashboard");
  const features = user.role === "ADMIN" ? ["Utilisateurs", "Missions", "Signalements", "Catégories", "Statistiques"] : user.role === "RECRUTEUR" ? ["Mes missions publiées", "Publier une mission", "Candidatures reçues", "Travailleurs sélectionnés", "Mon profil"] : ["Mes missions", "Mes candidatures", "Mon calendrier", "Rechercher des missions", "Mon profil"];
  const label = user.role === "ADMIN" ? "Administrateur" : user.role === "RECRUTEUR" ? "Recruteur" : "Travailleur";
  return <AuthShell><p className="auth-eyebrow">ESPACE {label.toUpperCase()}</p><h1>Bonjour {user.firstName || user.name} !</h1><p className="auth-description">Bienvenue dans votre Dashboard {label}.</p><p>{user.email}</p><p className="auth-description">Membre depuis le {user.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}.</p><ul>{features.map(feature => <li key={feature}>{feature} — interface à développer</li>)}</ul><LogoutButton /></AuthShell>;
}
