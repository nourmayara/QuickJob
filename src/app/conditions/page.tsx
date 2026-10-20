import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
export default function TermsPage() {
  return <AuthShell><p className="auth-eyebrow">QUICKJOB · VERSION DE DÉVELOPPEMENT</p><h1>Conditions d’utilisation</h1><p className="auth-description">QuickJob est actuellement un projet de démonstration. Les missions présentées sur l’accueil sont fictives.</p><p className="auth-description">En créant un compte, vous vous engagez à fournir des informations exactes, à préserver la confidentialité de vos identifiants et à respecter les autres utilisateurs. Vous choisissez un compte Travailleur ou Recruteur ; le rôle Administrateur n’est pas ouvert à l’inscription.</p><p className="auth-description">Les conditions complètes, l’identité de l’éditeur et les modalités de contact devront être publiées avant l’ouverture du service au public.</p><Link href="/register">← Revenir à l’inscription</Link></AuthShell>;
}
