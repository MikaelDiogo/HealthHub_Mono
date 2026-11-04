// Limiares de "crítico" usados no backend (lista de "atenção agora" do painel). VALORES IDÊNTICOS aos do frontend
// (HealthHub-Project/src/config/limiaresSinaisVitais.ts, que traz também os limiares de "atenção"): nenhum valor clínico
// foi escolhido ou alterado aqui. Mantenha as duas cópias iguais.
// `fonte`: documento que sustenta o número; `null` = sem fonte clínica registrada (valor adotado pelo desenvolvedor).
// Fonte consultada (levantamento de 03/11/2026): POP.HC-UFTM-DENF.003 v6 (HC-UFTM/Ebserh, 2025), Anexo E (FC 60 a 100 bpm).
export const FONTE_POP = 'POP.HC-UFTM-DENF.003 v6 (HC-UFTM/Ebserh, 2025)';

export interface LimiarFonte {
  fonte: string | null;
}

export const LIMIARES_CRITICOS = {
  // < 92: coincide com o NEWS 2 (≤ 91), mas o POP classifica 91% como hipóxia leve. Sem fonte clínica registrada.
  spo2: { abaixoDe: 92, fonte: null } as { abaixoDe: number } & LimiarFonte,
  // < 60 ou > 100: faixa de referência do adulto, 60 a 100 bpm (Anexo E do POP)
  frequenciaCardiaca: { abaixoDe: 60, acimaDe: 100, fonte: `${FONTE_POP}, Anexo E: faixa de referência do adulto, 60 a 100 bpm` } as { abaixoDe: number; acimaDe: number } & LimiarFonte,
  // > 38,5 °C: o POP e o NEWS 2 usam cortes em 38,1 e 39,1. Sem fonte clínica registrada.
  temperatura: { acimaDe: 38.5, fonte: null } as { acimaDe: number } & LimiarFonte,
} as const;

/**
 * Chave ALERTAS_SEM_FONTE. Padrão `true` (qualquer valor diferente de "false"): todos os alertas, como sempre foram.
 * `false` desliga SÓ os alertas cujo limiar tem `fonte: null`; os com fonte continuam. O registro dos sinais não muda.
 */
export function alertasSemFonteAtivos(env: Record<string, string | undefined> = process.env): boolean {
  return env.ALERTAS_SEM_FONTE !== 'false';
}

/** Um limiar vale quando tem fonte registrada ou quando os alertas sem fonte estão ligados. */
export function limiarAtivo(l: LimiarFonte, semFonteAtivos: boolean): boolean {
  return l.fonte !== null || semFonteAtivos;
}
