import { useId, type CSSProperties } from "react";
import Icon, { type IconName } from "@/components/recruiter/Icon";

type Tone = "navy" | "sky" | "yellow" | "glass";
type Variant = "clay" | "glass" | "outline";
// Solid silhouettes, raised details and highlights form the shared sculpted set.
const glyphs: Partial<Record<IconName, [string, string?, string?]>> = {
  plus: ["M9 2h6v7h7v6h-7v7H9v-7H2V9h7z", "M11 4v7H4"],
  grid: ["M2 2h8v8H2z M14 2h8v8h-8z M2 14h8v8H2z M14 14h8v8h-8z", "M4 5V4h3 M16 5V4h3 M4 17v-1h3 M16 17v-1h3"],
  search: ["M10 1a9 9 0 1 0 5 16l6 6 3-3-6-6A9 9 0 0 0 10 1", "M10 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M5 6l2-2"],
  clock: ["M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22", "M12 5v8l5 3 M5 7l2-2"],
  lock: ["M5 9h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3", "M7 9V6a5 5 0 0 1 10 0v3 M12 15v4"],
  settings: ["m9 1 6 0 1 4 4 1 3 6-3 5-4 1-1 5H9l-1-5-4-1-3-5 3-6 4-1z", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"],
  megaphone: ["M1 9 21 2v18L1 14z M5 15l2 8h5l-3-9z", "M4 10l14-5 M3 12h3"],
  briefcase: ["M5 7h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3", "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M3 12c5 4 13 4 18 0", "M10 12h4v5h-4z"],
  user: ["M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M3 21c0-10 18-10 18 0v1H3z", "M9 4c1-1 3-1 4-1 M5 19c1-2 2-3 4-3"],
  people: ["M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M7 22v-4c0-7 10-7 10 0v4z M4 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M1 20v-3c0-3 2-4 5-3v6z M20 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M18 14c3-1 5 0 5 3v3h-5z", "M10 5h2 M9 17c1-2 2-2 3-2"],
  check: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20", "m7 12 3 3 7-7"],
  shield: ["m12 2 9 4v6c0 6-9 11-9 11S3 18 3 12V6z", "m8 12 3 3 5-6 M6 7l6-2"],
  calendar: ["M5 4h14a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3", "M7 2v5 M17 2v5 M3 10h18 M7 15h3 M14 15h3 M7 19h3", "M14 18h3v3h-3z"],
  mail: ["M4 5h16a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3", "m3 8 9 7 9-7 M3 20l6-6 M21 20l-6-6"],
  pin: ["M12 1a9 9 0 0 0-9 9c0 6 9 13 9 13s9-7 9-13a9 9 0 0 0-9-9", "M8 6c1-2 3-2 4-2", "M12 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8"],
  chart: ["M3 11h4v11H3z M10 6h5v16h-5z M18 1h5v21h-5z", "M4 13v5 M12 8v8 M20 3v11"],
  document: ["M5 2h10l6 6v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3", "M14 3v6h6 M7 13h9 M7 17h7"],
  message: ["M5 2h14a4 4 0 0 1 4 4v11a4 4 0 0 1-4 4H9l-7 3V6a4 4 0 0 1 3-4", "M6 8h12 M6 13h8", "M19 1a4 4 0 1 0 0 8 4 4 0 0 0 0-8"],
  bell: ["M12 3c-6 0-8 5-8 10v3l-3 4h22l-3-4v-3c0-5-2-10-8-10 M9 22h6v2H9z", "M8 8c0-2 2-3 4-3 M11 1h2"],
  heart: ["M12 5C5-3-5 7 3 14l9 9 9-9C29 7 19-3 12 5", "M4 7c0-2 3-3 5-1"],
  star: ["m12 1 3 7 8 1-6 6 2 8-7-4-7 4 2-8-6-6 8-1z", "m11 5-2 6-4 1"],
  layers: ["m12 2 12 6-12 6L0 8z M1 12l11 5 11-5v4l-11 6-11-6z", "m6 7 6-3 6 3 M4 16l8 4"],
  store: ["M3 9h18v13H3z M3 2h18l3 7c0 4-5 4-6 1-1 3-5 3-6 0-1 3-5 3-6 0-1 3-6 3-6-1z", "M9 21v-7h6v7 M5 4h14"],
  truck: ["M1 3h14v15H1z M15 9h5l4 5v4h-9z M6 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M19 15a4 4 0 1 0 0 8 4 4 0 0 0 0-8", "M3 6h8 M17 11h2l2 3h-4", "M6 18a1 1 0 1 0 0 2 1 1 0 0 0 0-2 M19 18a1 1 0 1 0 0 2 1 1 0 0 0 0-2"],
  utensils: ["M3 1h2v6h1V1h2v6h1V1h2v8l-3 3v11H5V12L3 9z M19 1c-7 4-7 11-1 11v11h3V1z", "M6 14v6 M19 5v4"],
  handshake: ["m2 7 5-4 5 2 5-2 6 4-3 10-7 6-9-6z", "m7 8 5-3 5 4-4 4-3-2 M6 14l7 6 M11 13l6 5", "m1 6 4-2 4 11-4 2z M19 4l4 2-4 11-4-2z"],
  home: ["m12 1 12 10-3 2v10h-7v-7h-4v7H3V13l-3-2z", "m5 10 7-6 6 5"],
  monitor: ["M3 2h18a3 3 0 0 1 3 3v12H0V5a3 3 0 0 1 3-3 M10 17h4v4h5v2H5v-2h5z", "M4 6h14 M4 9h9"],
  headset: ["M1 13C1-3 23-3 23 13v8h-7v-9h4c0-12-16-12-16 0h4v9H1z", "M3 12v6 M19 14v4 M17 23h-5"],
};
const labels: Record<IconName, string> = { grid:"Vue d’ensemble",briefcase:"Missions",plus:"Ajouter",people:"Candidatures",check:"Validation",mail:"Courrier",user:"Profil",settings:"Paramètres",arrow:"Continuer",calendar:"Calendrier",pin:"Localisation",menu:"Menu",close:"Fermer",clock:"Horaire",shield:"Sécurité",search:"Recherche",home:"Accueil",chart:"Statistiques",handshake:"Recrutements",layers:"Catégories",heart:"Favoris",star:"Évaluation",document:"Documents",message:"Messagerie",bell:"Notifications",headset:"Support",utensils:"Restauration",truck:"Logistique",store:"Commerce",monitor:"Informatique",megaphone:"Promotion",edit:"Modifier",eye:"Afficher",eyeOff:"Masquer",logout:"Se déconnecter",lock:"Confidentialité",send:"Envoyer",chevronDown:"Développer" };
export const softIconManifest = Object.fromEntries(Object.entries(labels).map(([name,label]) => [name,{ label,tone: name === "star" || name === "bell" || name === "handshake" ? "yellow" : "sky" }])) as Record<IconName,{label:string;tone:Tone}>;

export default function SoftIcon({ name, size = 22, className = "", tone, variant }: { name: IconName; size?: number; className?: string; tone?: Tone; variant?: Variant }) {
  const id = `qji${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const glyph = glyphs[name];
  const surface = variant || (["chart","document","message","plus","search","settings","lock"].includes(name) ? "glass" : "clay");
  const asset = softIconManifest[name];
  return <span className={`qj-soft-icon ${className}`} data-icon={name} data-tone={tone || asset.tone} data-variant={surface} title={asset.label} aria-hidden="true" style={{ "--qji-glyph-size": `${size}px` } as CSSProperties}>{surface === "outline" || !glyph ? <Icon name={name} size={size} /> : <svg width={size} height={size} viewBox="-2 -2 29 29" fill="none" focusable="false"><defs><linearGradient id={id} x1=".1" y1="0" x2=".85" y2="1"><stop stopColor="var(--qji-light,#6dcaff)" /><stop offset=".48" stopColor="var(--qji-main,#287bff)" /><stop offset="1" stopColor="var(--qji-dark,#2045cd)" /></linearGradient><linearGradient id={`${id}a`}><stop stopColor="#fff0a7" /><stop offset="1" stopColor="#ffcb35" /></linearGradient></defs><path d={glyph[0]} fill="var(--qji-dark,#2045cd)" opacity=".22" transform="translate(.8 1.6)" /><path d={glyph[0]} fill={`url(#${id})`} stroke="var(--qji-light,#6dcaff)" strokeWidth=".35" />{glyph[1] && <path d={glyph[1]} stroke="#fff" strokeWidth={name === "check" ? 3.3 : 1.6} strokeLinecap="round" strokeLinejoin="round" opacity=".94" />}{glyph[2] && <path d={glyph[2]} fill={`url(#${id}a)`} />}</svg>}</span>;
}
