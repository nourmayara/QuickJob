import { dashboardPath } from "./roles";

export type Journey = "travailleur" | "recruteur";

// An intention changes presentation and navigation. It never grants a role.
export function parseJourney(value: string | null | undefined): Journey | null {
  return value === "travailleur" || value === "recruteur" ? value : null;
}
export function journeyRole(journey: Journey) {
  return journey === "recruteur" ? "RECRUTEUR" : "TRAVAILLEUR";
}
export function journeyDestination(journey: Journey) {
  return journey === "recruteur" ? "/recruteur/missions/nouvelle" : "/dashboard/travailleur/missions";
}
export function authHref(mode: "login" | "register", journey: Journey | null) {
  return `/${mode}${journey ? `?intent=${journey}` : ""}`;
}
export function destinationAfterAuth(actualRole: string, journey: Journey | null) {
  return journey && actualRole === journeyRole(journey) ? journeyDestination(journey) : dashboardPath(actualRole);
}
export function journeyAction(journey: Journey, actualRole: string | null) {
  if (!actualRole) return { href: authHref("register", journey), label: journey === "recruteur" ? "Publier une mission" : "Trouver une mission", note: `Un compte ${journey === "recruteur" ? "recruteur" : "travailleur"} est nécessaire.` };
  if (actualRole === journeyRole(journey)) return { href: journeyDestination(journey), label: journey === "recruteur" ? "Publier ma mission" : "Voir les missions", note: "Accès direct à votre espace personnel." };
  return { href: dashboardPath(actualRole), label: "Accéder à mon espace", note: "Votre compte conserve son rôle actuel. Vous pouvez découvrir les deux parcours ici." };
}
