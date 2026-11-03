import type { SinalVital } from '../types/patient';
import { LIMIARES_SINAIS_VITAIS as L } from '../config/limiaresSinaisVitais';

export type VitalStatus = 'critical' | 'warning' | 'normal' | 'unknown';

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
    (hasSpo2 && spo2 < L.spo2.criticoAbaixoDe)  ||
    (hasFc   && (fc > L.frequenciaCardiaca.criticoAcimaDe || fc < L.frequenciaCardiaca.criticoAbaixoDe)) ||
    (hasTemp && temp > L.temperatura.criticoAcimaDe)
  ) return 'critical';

  if (
    (hasSpo2 && spo2 < L.spo2.atencaoAbaixoDe)  ||
    (hasFc   && fc   > L.frequenciaCardiaca.atencaoAcimaDe)  ||
    (hasTemp && temp >= L.temperatura.atencaoAPartirDe)
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
  if (v < L.spo2.criticoAbaixoDe) return 'critical';
  if (v < L.spo2.atencaoAbaixoDe) return 'warning';
  return 'normal';
}
export function fcStatus(v: number): VitalStatus {
  if (v <= 0) return 'unknown';
  // Bradicardia (<60) é tão clinicamente relevante quanto taquicardia (>100) — faltava esse lado.
  if (v > L.frequenciaCardiaca.criticoAcimaDe || v < L.frequenciaCardiaca.criticoAbaixoDe) return 'critical';
  if (v > L.frequenciaCardiaca.atencaoAcimaDe)  return 'warning';
  return 'normal';
}
export function tempStatus(v: number): VitalStatus {
  if (v <= 0)   return 'unknown';
  if (v > L.temperatura.criticoAcimaDe) return 'critical';
  // >= 37.8, não > 37.8 — o limiar em si já conta como febre/alerta.
  if (v >= L.temperatura.atencaoAPartirDe) return 'warning';
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
