import type { ClassificacaoModelo } from './types';

/**
 * Extrai e valida o JSON da resposta bruta do modelo. Modelos às vezes
 * envolvem o JSON em ```json ... ``` mesmo quando instruídos a não fazer —
 * por isso tenta extrair o primeiro bloco {...} antes de desistir.
 */
export function parseClassificacao(textoBruto: string): ClassificacaoModelo | null {
  const tentativas = [textoBruto.trim()];

  const match = textoBruto.match(/\{[\s\S]*\}/);
  if (match) tentativas.push(match[0]);

  for (const tentativa of tentativas) {
    try {
      const obj = JSON.parse(tentativa);
      if (
        obj &&
        Array.isArray(obj.diagnoses) &&
        obj.diagnoses.length >= 1 &&
        obj.diagnoses.every((d: unknown) => typeof d === 'string') &&
        (obj.urgency === 'urgent' || obj.urgency === 'nonurgent')
      ) {
        return { diagnoses: obj.diagnoses.slice(0, 3), urgency: obj.urgency };
      }
    } catch {
      // tenta a próxima
    }
  }
  return null;
}
