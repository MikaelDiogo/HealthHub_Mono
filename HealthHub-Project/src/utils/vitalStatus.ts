import type { SinalVital } from '../types/patient';

export type VitalStatus = 'critical' | 'warning' | 'normal' | 'unknown';

/*
 * FONTE DOS LIMIARES (levantamento de 03/11/2026; ver evidencias_tcc/rodada_final/limiares_sinais_vitais.md, seção 5).
 * Referência consultada: POP.HC-UFTM-DENF.003 "Rotina de Registro de Sinais Vitais e Controles", versão 6 (HC-UFTM/Ebserh, 2025),
 * https://www.gov.br/hubrasil/pt-br/hospitais-universitarios/regiao-sudeste/hc-uftm/documentos/procedimentos-e-rotinas-operacionais-padrao/pops/POP.HCUFTMDENF.003RotinadeRegistrodeSinaisVitaiseControlesversao6.pdf
 * É um POP de internação (não de triagem), e ele não usa os termos "atenção"/"crítico".
 *
 * COM correspondência no POP (adulto):
 *   - FC: 60 a 100 bpm é a faixa de referência; < 60 bradicardia, > 100 taquicardia (Anexo E).
 *   - SpO₂: 95 a 100 % é normal (Anexo H); "≤ 91" vale 3 pontos no NEWS 2 (Anexo A).
 *   - Temperatura: >= 37,8 °C é o início de "febre baixa" (Anexo F).
 * SEM correspondência no POP (valores adotados pelo desenvolvedor, sem fonte clínica registrada):
 *   - FC > 90 bpm como "atenção" (90 é o teto da faixa de adolescente no Anexo E, não do adulto).
 *   - Temperatura > 38,5 °C como "crítico" (o POP e o NEWS 2 usam cortes em 38,1 e 39,1).
 *   - SpO₂ < 92 como "crítico": coincide com o NEWS 2 (≤ 91), mas no Anexo H o 91 está em "hipóxia leve".
 * Pressão arterial: sem limiar e sem alerta (campo de texto livre).
 * Os valores NÃO foram alterados por causa dessa consulta. Qualquer mudança é decisão clínica do autor/orientador;
 * os limiares de "crítico" também existem em HealthHub-BackEnd/src/modules/metricas/application/calcular-metricas.ts.
 */

/** Calcula o status clínico a partir do último registro de sinais vitais */
export function getVitalStatus(sinaisVitais?: SinalVital[]): VitalStatus {
  const latest = sinaisVitais?.[0];
  if (!latest) return 'unknown';

  const spo2 = Number(latest.saturacao_oxigenio);
  const fc   = Number(latest.frequencia_cardiaca);
  const temp = Number(latest.temperatura);

  const hasSpo2 = spo2 > 0;
  const hasFc   = fc   > 0;
  const hasTemp = temp > 0;

  if (
    (hasSpo2 && spo2 < 92)  ||
    (hasFc   && (fc > 100 || fc < 60)) ||
    (hasTemp && temp > 38.5)
  ) return 'critical';

  if (
    (hasSpo2 && spo2 < 95)  ||
    (hasFc   && fc   > 90)  ||
    (hasTemp && temp >= 37.8)
  ) return 'warning';

  if (hasSpo2 || hasFc || hasTemp) return 'normal';
  return 'unknown';
}

/** Cor CSS para a bolinha/barra de status */
export function getStatusCSSColor(status: VitalStatus): string {
  switch (status) {
    case 'critical': return 'var(--mantine-color-red-6)';
    case 'warning':  return 'var(--mantine-color-yellow-5)';
    case 'normal':   return 'var(--mantine-color-green-6)';
    default:         return 'var(--mantine-color-slate-3)';
  }
}

/** Nome da cor Mantine para uso em color="..." */
export function getStatusMantineColor(status: VitalStatus): string {
  switch (status) {
    case 'critical': return 'red';
    case 'warning':  return 'yellow';
    case 'normal':   return 'green';
    default:         return 'slate';
  }
}

/** Dispara evento global quando sinais vitais são salvos */
export function dispatchVitalsUpdated(patientId: string) {
  window.dispatchEvent(new CustomEvent('vitals-updated', { detail: { patientId } }));
}

// ─── Status por métrica individual (para CardDashboard) ───────────────────────
export function spo2Status(v: number): VitalStatus {
  if (v <= 0) return 'unknown';
  if (v < 92) return 'critical';
  if (v < 95) return 'warning';
  return 'normal';
}
export function fcStatus(v: number): VitalStatus {
  if (v <= 0) return 'unknown';
  // Bradicardia (<60) é tão clinicamente relevante quanto taquicardia (>100) — faltava esse lado.
  if (v > 100 || v < 60) return 'critical';
  if (v > 90)  return 'warning';
  return 'normal';
}
export function tempStatus(v: number): VitalStatus {
  if (v <= 0)   return 'unknown';
  if (v > 38.5) return 'critical';
  // >= 37.8, não > 37.8 — o limiar em si já conta como febre/alerta.
  if (v >= 37.8) return 'warning';
  return 'normal';
}

// ─── Cores da classificação de risco → CSS ────────────────────────────────────
// Escala de 5 cores: decisão de projeto do protótipo (a cor é escolhida manualmente pelo enfermeiro).
const RISCO_MAP: Record<string, string> = {
  Vermelho: 'oklch(0.55 0.21 25)',
  Laranja:  'oklch(0.68 0.18 45)',
  Amarelo:  'oklch(0.82 0.15 90)',
  Verde:    'oklch(0.68 0.14 150)',
  Azul:     'oklch(0.55 0.13 240)',
};
/** Os 5 níveis da escala de classificação de risco do protótipo, em ordem de prioridade. */
export const NIVEIS_RISCO = [
  { nivel: 'Vermelho', mantine: 'red' },
  { nivel: 'Laranja',  mantine: 'orange' },
  { nivel: 'Amarelo',  mantine: 'yellow' },
  { nivel: 'Verde',    mantine: 'green' },
  { nivel: 'Azul',     mantine: 'blue' },
] as const;

/** Converte a classificação de risco em cor CSS (cinza se não classificado) */
export function riscoCSSColor(gravidade?: string | null): string {
  if (!gravidade) return 'var(--mantine-color-slate-3)';
  return RISCO_MAP[gravidade] ?? 'var(--mantine-color-slate-3)';
}
