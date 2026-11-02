import type { IconName } from "./recruiter/Icon";

export function categoryIcon(category: string | null): IconName {
  const label = (category || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/restaur|cuisin|cafe|hotel/.test(label)) return "utensils";
  if (/commerc|vente|magasin/.test(label)) return "store";
  if (/logist|livraison|transport/.test(label)) return "truck";
  if (/evenement|accueil/.test(label)) return "calendar";
  if (/informat|tech/.test(label)) return "monitor";
  if (/admin/.test(label)) return "document";
  if (/promot/.test(label)) return "megaphone";
  if (/service/.test(label)) return "handshake";
  return "layers";
}
