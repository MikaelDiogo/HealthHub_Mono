import { LIMIARES_CRITICOS, limiarAtivo } from './limiares-sinais-vitais';

// Mesma regra do frontend (HealthHub-Project/src/utils/pressaoArterial.ts). A pressão é texto livre (varchar):
// PAS e PAD com 2 ou 3 dígitos, separadas por "/", "x" ou "X", espaços opcionais. Fora disso, ou fora de 30 a 300 mmHg: desconhecida (sem alerta, sem erro).
const FORMATO = /^\s*(\d{2,3})\s*[/xX]\s*(\d{2,3})\s*$/;
const MIN_MMHG = 30;
const MAX_MMHG = 300;

export function lerPressao(texto: string | null | undefined): { pas: number; pad: number } | null {
  if (typeof texto !== 'string') return null;
  const m = FORMATO.exec(texto);
  if (!m) return null;
  const pas = Number(m[1]);
  const pad = Number(m[2]);
  if (pas < MIN_MMHG || pas > MAX_MMHG || pad < MIN_MMHG || pad > MAX_MMHG) return null;
  return { pas, pad };
}

/** No backend só importa o nível crítico (lista "atenção agora"): PAS <= 90, PAS >= 180 ou PAD >= 120. */
export function pressaoCritica(pas: number, pad: number, semFonte = true): boolean {
  const c = LIMIARES_CRITICOS.pressaoArterial;
  return limiarAtivo(c, semFonte) && (pas <= c.pasAte || pas >= c.pasDe || pad >= c.padDe);
}
