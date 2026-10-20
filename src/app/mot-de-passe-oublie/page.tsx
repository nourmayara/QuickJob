import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
export default function ForgotPasswordPage() {
  return <AuthShell><p className="auth-eyebrow">BESOIN D’UN COUP DE MAIN ?</p><h1>Mot de passe oublié ?</h1><p className="auth-description">La réinitialisation du mot de passe par email n’est pas encore disponible sur QuickJob. Aucun email de récupération ne peut être envoyé pour le moment.</p><Link href="/login">← Revenir à la connexion</Link></AuthShell>;
}
