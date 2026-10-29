import type { SinalVital } from '../types/patient';

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

// ─── Cores de Triagem Manchester → CSS ────────────────────────────────────────
const MANCHESTER_MAP: Record<string, string> = {
  Vermelho: 'oklch(0.55 0.21 25)',
  Laranja:  'oklch(0.68 0.18 45)',
  Amarelo:  'oklch(0.82 0.15 90)',
  Verde:    'oklch(0.68 0.14 150)',
  Azul:     'oklch(0.55 0.13 240)',
};
/** Os 5 níveis em ordem de prioridade, com o tempo-alvo de atendimento. */
export const NIVEIS_MANCHESTER = [
  { nivel: 'Vermelho', mantine: 'red',    tempo: 'Imediato' },
  { nivel: 'Laranja',  mantine: 'orange', tempo: '10 min' },
  { nivel: 'Amarelo',  mantine: 'yellow', tempo: '60 min' },
  { nivel: 'Verde',    mantine: 'green',  tempo: '120 min' },
  { nivel: 'Azul',     mantine: 'blue',   tempo: '240 min' },
] as const;

/** Converte gravidade Manchester em cor CSS (cinza se não triado) */
export function manchesterCSSColor(gravidade?: string | null): string {
  if (!gravidade) return 'var(--mantine-color-slate-3)';
  return MANCHESTER_MAP[gravidade] ?? 'var(--mantine-color-slate-3)';
}
