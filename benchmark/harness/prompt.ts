import type { Vinheta } from './types';

/**
 * Prompt único para todos os modelos (desenho de Sorich et al., 2024, JMIR).
 * Em inglês, para ficar comparável à literatura. Pede raciocínio interno
 * passo a passo, mas a saída visível deve ser SOMENTE o JSON — isso é o que
 * torna a resposta parseável igual para todos os modelos.
 */
export const SYSTEM_PROMPT = `You are a clinical triage assistant evaluated on diagnostic vignettes.
For the patient case you receive:
1. Reason step by step internally about the most likely diagnoses and the urgency of care needed.
2. Do NOT show your reasoning. Output ONLY a single JSON object, nothing else — no markdown fences, no prose before or after.
3. The JSON must have exactly this shape:
   {"diagnoses": ["most likely diagnosis", "second most likely", "third most likely"], "urgency": "urgent" or "nonurgent"}
4. "urgent" = needs emergency department or a doctor within 1 day. "nonurgent" = can see a doctor within 1 week, or self-care.
Respond with the JSON object only.`;

export function buildUserPrompt(vinheta: Vinheta): string {
  return `Patient case:\n${vinheta.vinheta}`;
}
