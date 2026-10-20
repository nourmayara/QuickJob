import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
export default function PrivacyPage() {
  return <AuthShell><p className="auth-eyebrow">VOS INFORMATIONS</p><h1>Données personnelles</h1><p className="auth-description">Cette version enregistre votre nom, prénom, email, téléphone, rôle et, si vous les renseignez, votre ville ou vos informations d’entreprise pour votre compte. Le mot de passe est conservé sous forme de hash bcrypt.</p><p className="auth-description">Un cookie de session HttpOnly permet de maintenir votre connexion pendant sept jours au maximum. La déconnexion supprime ce cookie.</p><p className="auth-description">Le projet est en développement. L’identité du responsable, ses coordonnées, les durées de conservation et les modalités d’exercice de vos droits restent à définir avant toute ouverture au public.</p><Link href="/register">← Revenir à l’inscription</Link></AuthShell>;
}
