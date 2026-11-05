import { LIMIARES_SINAIS_VITAIS as L, limiarAtivo } from '../config/limiaresSinaisVitais';

export type NivelPressao = 'critical' | 'warning' | 'normal';

// A pressão continua sendo texto livre (varchar). Formato aceito: PAS e PAD com 2 ou 3 dígitos, separadas por "/", "x" ou "X",
// com espaços opcionais ("120/80", "120x80", "120 / 80"). Fora disso, ou fora de 30 a 300 mmHg, é "desconhecida": sem alerta e sem erro.
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

/** Crítico: PAS <= 90, PAS >= 180 ou PAD >= 120. Atenção: PAS 91 a 100, PAS >= 140 ou PAD >= 90. Crítico vence atenção. */
export function nivelPressao(pas: number, pad: number, semFonte = true): NivelPressao {
  const c = L.pressaoArterial.critico;
  const a = L.pressaoArterial.atencao;
  if (limiarAtivo(c, semFonte) && (pas <= c.pasAte || pas >= c.pasDe || pad >= c.padDe)) return 'critical';
  if (limiarAtivo(a, semFonte) && ((pas >= a.pasDe && pas <= a.pasAte) || pas >= a.pasAcimaDe || pad >= a.padDe)) return 'warning';
  return 'normal';
}
