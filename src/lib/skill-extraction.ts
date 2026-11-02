export type ExtractedSkill = {
  key: string;
  name: string;
  confidence: number;
  source: "structured" | "rule-based" | "llm";
  evidence?: string;
};

export interface SkillExtractor {
  extract(text: string): Promise<ExtractedSkill[]>;
}

type SkillRule = { name: string; patterns: RegExp[] };

// Every rule requires an explicit expression in the source text. Broad personality
// traits and inferred skills are deliberately excluded.
const skillRules: SkillRule[] = [
  { name: "Accueil client", patterns: [/accue(?:il|illir|illi|illais|illant)\s+(?:des?\s+|les?\s+)?client(?:e|s|es)?/iu, /accueil\s+(?:de\s+la\s+)?client[eè]le/iu] },
  { name: "Service en salle", patterns: [/service\s+(?:des?\s+clients?\s+)?en\s+salle/iu, /servi(?:r|s|e|es|t)?\s+(?:les?|des?)\s+(?:plats?|clients?|tables?)/iu] },
  { name: "Prise de commandes", patterns: [/(?:prise|prises)\s+de\s+commandes?/iu, /(?:pris|prendre|prenais|enregistr[ée]?)\s+(?:les?|des?)\s+commandes?/iu] },
  { name: "Préparation culinaire", patterns: [/pr[ée]par(?:er|é|ée|ais|ation)\s+(?:des?\s+)?(?:plats?|repas|sandwichs?|salades?|desserts?)/iu, /mise\s+en\s+place\s+(?:en\s+)?cuisine/iu] },
  { name: "Dressage de tables", patterns: [/(?:dresser|dress[ée]|dressage)\s+(?:les?|des?)\s+tables?/iu, /mise\s+en\s+place\s+(?:de\s+la\s+)?salle/iu] },
  { name: "Hygiène alimentaire", patterns: [/hygi[èe]ne\s+(?:alimentaire|en\s+cuisine)/iu, /normes?\s+(?:d['’])?hygi[èe]ne/iu, /haccp/iu] },
  { name: "Encaissement", patterns: [/(?:encaissement|encaiss(?:er|é|ée|ais|ant))/iu, /tenu(?:e)?\s+(?:de\s+)?(?:la\s+)?caisse/iu, /gestion\s+de\s+(?:la\s+)?caisse/iu] },
  { name: "Conseil client", patterns: [/(?:conseill(?:er|é|ée|ais|ant)|orient(?:er|é|ée))\s+(?:les?|des?)\s+clients?/iu, /conseil\s+(?:à\s+la\s+)?client[eè]le/iu] },
  { name: "Vente", patterns: [/(?:réalis(?:er|é|ée)|effectu(?:er|é|ée))\s+(?:des?\s+)?ventes?/iu, /conseill(?:er|ère)\s+de\s+vente/iu, /vendeur|vendeuse/iu] },
  { name: "Mise en rayon", patterns: [/(?:mise|mis|mettre)\s+(?:(?:les?|des?)\s+produits?\s+)?en\s+rayon/iu, /r[ée]assort(?:ir|iment|i)/iu] },
  { name: "Merchandising", patterns: [/merchandising/iu, /implantation\s+(?:des?\s+)?produits?/iu, /agencement\s+(?:du\s+)?rayon/iu] },
  { name: "Gestion des stocks", patterns: [/gestion\s+(?:des?|du)\s+stocks?/iu, /g[ée]r(?:er|é|ée|ais|ant)\s+(?:les?|des?|du)\s+stocks?/iu, /inventaires?\s+(?:(?:de|des)\s+)?stocks?/iu] },
  { name: "Fidélisation client", patterns: [/(?:fid[ée]lisation|fid[ée]lis(?:er|é|ée))\s+(?:(?:de\s+)?la\s+)?client[eè]le/iu, /programme\s+de\s+fid[ée]lit[ée]/iu] },
  { name: "Prospection commerciale", patterns: [/prospection\s+(?:commerciale|t[ée]l[ée]phonique|terrain)/iu, /prospect(?:er|é|ée|ais|ant)\s+(?:de\s+)?nouveaux?\s+clients?/iu] },
  { name: "Négociation commerciale", patterns: [/n[ée]gociation\s+commerciale/iu, /n[ée]goci(?:er|é|ée|ais|ant)\s+(?:des?\s+)?(?:prix|contrats?|offres?)/iu] },
  { name: "Utilisation d’un CRM", patterns: [/(?:utilis(?:er|é|ée)|ma[îi]trise)\s+(?:d['’]un\s+|du\s+)?crm/iu, /salesforce|hubspot/iu] },
  { name: "Support informatique", patterns: [/support\s+informatique/iu, /technicien(?:ne)?\s+(?:de\s+)?support/iu, /assistance\s+(?:aux\s+utilisateurs|informatique)/iu, /help\s?desk/iu] },
  { name: "Dépannage informatique", patterns: [/(?:d[ée]pann(?:er|é|ée|age)|diagnostiquer)\s+(?:des?\s+)?(?:postes?|ordinateurs?|pannes?)/iu, /r[ée]solution\s+(?:des?\s+)?incidents?\s+informatiques?/iu] },
  { name: "Installation de logiciels", patterns: [/(?:install(?:er|é|ée|ation)|d[ée]ploy(?:er|é|ée))\s+(?:des?\s+)?logiciels?/iu, /d[ée]ploiement\s+(?:d['’])?applications?/iu] },
  { name: "Administration système", patterns: [/administration\s+(?:de\s+)?syst[èe]mes?/iu, /windows\s+server|linux\s+server/iu, /active\s+directory/iu] },
  { name: "Administration réseau", patterns: [/(?:configur(?:er|é|ée|ation)|administr(?:er|é|ée|ation))\s+(?:(?:des?|du)\s+)?r[ée]seaux?/iu, /tcp\/?ip|routeurs?|switchs?/iu] },
  { name: "Gestion de tickets", patterns: [/(?:gestion|traitement|g[ée]r(?:er|é|ée))\s+(?:(?:des?|de)\s+)?tickets?/iu, /jira\s+service|glpi|service\s?now/iu] },
  { name: "Développement web", patterns: [/d[ée]veloppement\s+(?:d['’])?(?:applications?\s+)?web/iu, /d[ée]velopp(?:er|é|ée)\s+(?:un|une|des)\s+(?:site|application)\s+web/iu] },
  { name: "JavaScript", patterns: [/javascript|node\.?js/iu] },
  { name: "TypeScript", patterns: [/typescript/iu] },
  { name: "React", patterns: [/react(?:\.js|js)?/iu, /next\.?js/iu] },
  { name: "Python", patterns: [/python/iu] },
  { name: "Java", patterns: [/(?:^|[^a-z])java(?:[^a-z]|$)/iu] },
  { name: "Bases de données SQL", patterns: [/(?:bases?\s+de\s+donn[ée]es?\s+)?sql/iu, /mysql|postgresql|sqlite/iu] },
  { name: "Git", patterns: [/(?:^|[^a-z])git(?:hub|lab)?(?:[^a-z]|$)/iu, /gestion\s+de\s+versions?/iu] },
  { name: "Cybersécurité", patterns: [/cybers[ée]curit[ée]|s[ée]curit[ée]\s+informatique/iu] },
  { name: "Bureautique", patterns: [/bureautique|pack\s+office|microsoft\s+office/iu] },
  { name: "Microsoft Excel", patterns: [/excel|tableurs?/iu] },
  { name: "Saisie de données", patterns: [/(?:saisie|saisir)\s+(?:de\s+|des?\s+)?donn[ée]es/iu, /saisie\s+informatique/iu] },
  { name: "Préparation de commandes", patterns: [/(?:pr[ée]paration|pr[ée]par(?:er|é|ée))\s+(?:des?|de)\s+commandes?/iu, /picking/iu] },
  { name: "Manutention", patterns: [/manutention|chargement\s+et\s+d[ée]chargement/iu] },
  { name: "Travail en équipe", patterns: [/(?:travaill(?:er|é|ée|ais)|collabor(?:er|é|ée))\s+en\s+[ée]quipe/iu, /travail\s+en\s+[ée]quipe/iu] },
];

export function normalizeSkillKey(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
}

export class RuleBasedSkillExtractor implements SkillExtractor {
  async extract(text: string) {
    if (!text.trim()) return [];
    const found = new Map<string, ExtractedSkill>();
    for (const rule of skillRules) {
      const evidence = rule.patterns.map(pattern => text.match(pattern)?.[0]?.trim()).find(Boolean);
      const key = normalizeSkillKey(rule.name);
      if (evidence && !found.has(key)) found.set(key, { key, name: rule.name, confidence: 1, source: "rule-based", evidence });
    }
    return [...found.values()].slice(0, 12);
  }
}

export function createSkillExtractor(external?: SkillExtractor): SkillExtractor {
  return external ?? new RuleBasedSkillExtractor();
}
