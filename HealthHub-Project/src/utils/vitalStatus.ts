import type { SinalVital } from '../types/patient';
import { LIMIARES_SINAIS_VITAIS as L, alertasSemFonteAtivos, limiarAtivo } from '../config/limiaresSinaisVitais';
import { lerPressao, nivelPressao } from './pressaoArterial';

export type VitalStatus = 'critical' | 'warning' | 'normal' | 'unknown';

/*
 * FONTE DOS LIMIARES: cada número e a sua fonte ficam em config/limiaresSinaisVitais.ts (rodada 3, 05/11/2026).
 * Fontes: POP.HC-UFTM-DENF.003 v6 (HC-UFTM/Ebserh, 2025), NEWS2 (RCP, 2017), critérios de SIRS (Bone et al., 1992),
 * Diretrizes Brasileiras de Hipertensão 2020 (SBC), Linha de cuidado da hipertensão (MS) e Posicionamento sobre Crise Hipertensiva (SBC, 2020).
 * Os rótulos "atenção" e "crítico" são uma convenção do projeto; as fontes documentam o NÚMERO.
 * Regras: o nível do paciente é o PIOR entre os sinais (crítico vence atenção). Valor ausente ou <= 0 é desconhecido.
 * Pressão arterial: texto livre ("120/80", "120x80"); formato inválido ou fora de 30 a 300 mmHg = desconhecida (sem alerta, sem erro).
 * Os limiares de "crítico" também existem em HealthHub-BackEnd/src/modules/metricas/application/calcular-metricas.ts.
 * Chave VITE_ALERTAS_SEM_FONTE=false desliga só os alertas com `fonte: null` (hoje nenhum limiar está nessa condição).
 */

/** Calcula o status clínico a partir do último registro de sinais vitais */
export function getVitalStatus(sinaisVitais?: SinalVital[], semFonte: boolean = alertasSemFonteAtivos()): VitalStatus {
  const latest = sinaisVitais?.[0];
  if (!latest) return 'unknown';

  const niveis = [
    spo2Status(Number(latest.saturacao_oxigenio), semFonte),
    fcStatus(Number(latest.frequencia_cardiaca), semFonte),
    tempStatus(Number(latest.temperatura), semFonte),
    pressaoStatus(latest.pressao_arterial, semFonte),
  ];
  if (niveis.includes('critical')) return 'critical';
  if (niveis.includes('warning')) return 'warning';
  if (niveis.includes('normal')) return 'normal';
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
export function spo2Status(v: number, semFonte: boolean = alertasSemFonteAtivos()): VitalStatus {
  if (!(v > 0)) return 'unknown';
  if (limiarAtivo(L.spo2.critico, semFonte) && v < L.spo2.critico.abaixoDe) return 'critical';
  if (limiarAtivo(L.spo2.atencao, semFonte) && v < L.spo2.atencao.abaixoDe) return 'warning';
  return 'normal';
}
export function fcStatus(v: number, semFonte: boolean = alertasSemFonteAtivos()): VitalStatus {
  if (!(v > 0)) return 'unknown';
  // Bradicardia (<60) é tão clinicamente relevante quanto taquicardia (>100) — faltava esse lado.
  const c = L.frequenciaCardiaca.critico;
  if (limiarAtivo(c, semFonte) && (v > c.acimaDe || v < c.abaixoDe)) return 'critical';
  if (limiarAtivo(L.frequenciaCardiaca.atencao, semFonte) && v > L.frequenciaCardiaca.atencao.acimaDe) return 'warning';
  return 'normal';
}
export function tempStatus(v: number, semFonte: boolean = alertasSemFonteAtivos()): VitalStatus {
  if (!(v > 0)) return 'unknown';
  if (limiarAtivo(L.temperatura.critico, semFonte) && v >= L.temperatura.critico.aPartirDe) return 'critical';
  // >= 37.8, não > 37.8 — o limiar em si já conta como febre/alerta.
  if (limiarAtivo(L.temperatura.atencao, semFonte) && v >= L.temperatura.atencao.aPartirDe) return 'warning';
  return 'normal';
}

/** Pressão arterial a partir do texto livre; formato inválido = 'unknown' (sem alerta). */
export function pressaoStatus(texto: string | null | undefined, semFonte: boolean = alertasSemFonteAtivos()): VitalStatus {
  const pa = lerPressao(texto);
  if (!pa) return 'unknown';
  return nivelPressao(pa.pas, pa.pad, semFonte);
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
