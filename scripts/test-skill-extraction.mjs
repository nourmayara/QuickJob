import assert from "node:assert/strict";
import { RuleBasedSkillExtractor, normalizeSkillKey } from "../src/lib/skill-extraction.ts";

const cases = [
  {
    domain: "restauration",
    text: "Pendant deux ans comme serveuse, j’ai pris les commandes, assuré le service en salle, dressé les tables, tenu la caisse et respecté les règles d’hygiène alimentaire.",
    expected: ["Prise de commandes", "Service en salle", "Dressage de tables", "Encaissement", "Hygiène alimentaire"],
  },
  {
    domain: "informatique",
    text: "Technicien support informatique, j’ai dépanné des postes Windows, installé des logiciels, configuré des réseaux, géré des tickets dans GLPI et administré Active Directory.",
    expected: ["Support informatique", "Dépannage informatique", "Installation de logiciels", "Administration réseau", "Gestion de tickets", "Administration système"],
  },
  {
    domain: "vente",
    text: "Conseillère de vente en boutique, j’ai conseillé les clients, mis les produits en rayon, tenu la caisse, géré les stocks et fidélisé la clientèle.",
    expected: ["Vente", "Conseil client", "Mise en rayon", "Encaissement", "Gestion des stocks", "Fidélisation client"],
  },
  {
    domain: "logistique",
    text: "Agent logistique, j’ai préparé des commandes, réalisé des inventaires de stocks, effectué du picking et assuré le chargement et déchargement des colis.",
    expected: ["Préparation de commandes", "Gestion des stocks", "Manutention"],
  },
];

const extractor = new RuleBasedSkillExtractor();
const signatures = [];
for (const test of cases) {
  const skills = await extractor.extract(test.text);
  const names = skills.map(skill => skill.name);
  for (const expected of test.expected) assert(names.includes(expected), `${test.domain}: compétence manquante: ${expected}`);
  assert.equal(new Set(skills.map(skill => skill.key)).size, skills.length, `${test.domain}: doublon détecté`);
  for (const skill of skills) assert(normalizeSkillKey(test.text).includes(normalizeSkillKey(skill.evidence || "---")), `${test.domain}: preuve absente pour ${skill.name}`);
  signatures.push(names.join("|"));
  console.log(`${test.domain}: ${names.join(", ")}`);
}
assert.equal(new Set(signatures).size, cases.length, "Les domaines ne doivent pas produire les mêmes résultats");
console.log("Extraction locale: 4 scénarios cohérents validés.");
