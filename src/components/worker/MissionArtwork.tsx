import Image from "next/image";

const categoryArt = [
  { pattern: /restaur|cuisin|caf[eé]|h[oô]tel/i, src: "/images/mission-restaurant.webp", label: "Scène de restauration" },
  { pattern: /commerc|magasin|boutique|vente/i, src: "/images/mission-commerce.webp", label: "Scène de commerce" },
  { pattern: /logist|livraison|transport|entrep[oô]t/i, src: "/images/mission-logistique.webp", label: "Scène de livraison" },
  { pattern: /[eé]v[eé]nement|accueil|promotion/i, src: "/images/mission-evenementiel.webp", label: "Scène événementielle" },
  { pattern: /service|domicile|ménage|m[eé]nage|nettoyage/i, src: "/images/mission-services.webp", label: "Scène de service à domicile" },
];

export default function MissionArtwork({ category, className = "" }: { category: string | null; className?: string }) {
  const art = categoryArt.find(item => item.pattern.test(category || ""));
  return <div className={`wk-mission-art ${className}`}>
    <Image src={art?.src || "/images/quickjob-city-desktop.webp"} alt={art?.label || "Ville QuickJob illustrée"} fill sizes="(max-width: 760px) 100vw, (max-width: 1200px) 45vw, 32vw" />
    <span className="wk-mission-art-light" aria-hidden="true" />
  </div>;
}
