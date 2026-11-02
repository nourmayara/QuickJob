import "server-only";
import { createSkillExtractor, normalizeSkillKey, type ExtractedSkill, type SkillExtractor } from "./skill-extraction";

type ExtractionResult = {
  skills: ExtractedSkill[];
  provider: "llm" | "local";
  notice?: string;
};

function supportedEvidence(text: string, evidence: unknown) {
  if (typeof evidence !== "string" || evidence.trim().length < 2 || evidence.length > 180) return null;
  return normalizeSkillKey(text).includes(normalizeSkillKey(evidence)) ? evidence.trim() : null;
}

class ConfigurableLlmSkillExtractor implements SkillExtractor {
  constructor(private endpoint: string, private apiKey: string | undefined, private model: string) {}

  async extract(text: string): Promise<ExtractedSkill[]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Tu extrais uniquement des compétences professionnelles explicitement démontrées par le texte fourni. N'infère rien. Réponds en JSON strict: {\"skills\":[{\"name\":\"...\",\"evidence\":\"court extrait exact du texte\"}]}. Maximum 12 compétences, sans qualités vagues ni doublons." },
          { role: "user", content: text },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`LLM indisponible (${response.status})`);
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Réponse LLM vide");
    const decoded = JSON.parse(content) as { skills?: { name?: unknown; evidence?: unknown }[] };
    if (!Array.isArray(decoded.skills)) throw new Error("Format LLM invalide");
    const unique = new Map<string, ExtractedSkill>();
    for (const candidate of decoded.skills.slice(0, 12)) {
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const evidence = supportedEvidence(text, candidate.evidence);
      const key = normalizeSkillKey(name);
      if (name.length >= 2 && name.length <= 60 && evidence && !unique.has(key)) {
        unique.set(key, { key, name, evidence, confidence: 1, source: "llm" });
      }
    }
    return [...unique.values()];
  }
}

export async function extractSkillsWithFallback(text: string): Promise<ExtractionResult> {
  const endpoint = process.env.SKILL_LLM_ENDPOINT?.trim();
  if (endpoint) {
    try {
      const extractor = new ConfigurableLlmSkillExtractor(endpoint, process.env.SKILL_LLM_API_KEY, process.env.SKILL_LLM_MODEL?.trim() || "default");
      const skills = await extractor.extract(text);
      if (skills.length) return { skills, provider: "llm" };
    } catch (error) {
      console.warn("Extraction LLM indisponible, repli local utilisé", error instanceof Error ? error.message : error);
    }
  }
  const skills = await createSkillExtractor().extract(text);
  return {
    skills,
    provider: "local",
    notice: endpoint ? "Le service IA est indisponible. Les suggestions locales ont été utilisées." : "Analyse locale utilisée : aucun texte n’a été envoyé à un service externe.",
  };
}
