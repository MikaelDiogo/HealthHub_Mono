// Limiares de alerta de sinais vitais, em um só lugar, cada um com a sua FONTE.
// VALORES IDÊNTICOS aos que já existiam em utils/vitalStatus.ts: nenhum valor clínico foi escolhido ou alterado.
//
// `fonte`: documento que sustenta o número. `null` = SEM fonte clínica registrada (valor adotado pelo desenvolvedor).
// Fonte consultada (levantamento de 03/11/2026; evidencias_tcc/rodada_final/limiares_sinais_vitais.md, seção 5):
// POP.HC-UFTM-DENF.003 "Rotina de Registro de Sinais Vitais e Controles", versão 6, HC-UFTM/Ebserh, 14/11/2025.
// É um POP de internação (não de triagem) e não usa os termos "atenção" e "crítico". Pressão arterial: sem limiar e sem alerta.
// O backend tem uma cópia dos limiares de "crítico" (HealthHub-BackEnd/src/config/limiares-sinais-vitais.ts): mantenha as duas iguais.
export const FONTE_POP = 'POP.HC-UFTM-DENF.003 v6 (HC-UFTM/Ebserh, 2025)';

export interface LimiarFonte {
  /** Documento que sustenta o valor; null = sem fonte clínica registrada */
  fonte: string | null;
}

export const LIMIARES_SINAIS_VITAIS = {
  spo2: {
    // < 92: coincide com o NEWS 2 (≤ 91), mas o POP classifica 91% como hipóxia leve (Anexo H). Sem fonte registrada.
    critico: { abaixoDe: 92, fonte: null } as { abaixoDe: number } & LimiarFonte,
    // < 95: faixa normal de 95 a 100% (Anexo H do POP)
    atencao: { abaixoDe: 95, fonte: `${FONTE_POP}, Anexo H: faixa normal 95 a 100%` } as { abaixoDe: number } & LimiarFonte,
  },
  frequenciaCardiaca: {
    // < 60 ou > 100: faixa de referência do adulto, 60 a 100 bpm (Anexo E do POP)
    critico: { abaixoDe: 60, acimaDe: 100, fonte: `${FONTE_POP}, Anexo E: faixa de referência do adulto, 60 a 100 bpm` } as { abaixoDe: number; acimaDe: number } & LimiarFonte,
    // > 90: sem correspondência (90 é o teto da faixa de adolescente no POP, não do adulto). Sem fonte registrada.
    atencao: { acimaDe: 90, fonte: null } as { acimaDe: number } & LimiarFonte,
  },
  temperatura: {
    // > 38,5 °C: o POP e o NEWS 2 usam cortes em 38,1 e 39,1. Sem fonte registrada.
    critico: { acimaDe: 38.5, fonte: null } as { acimaDe: number } & LimiarFonte,
    // >= 37,8 °C: início da febre baixa (Anexo F do POP)
    atencao: { aPartirDe: 37.8, fonte: `${FONTE_POP}, Anexo F: início da febre baixa` } as { aPartirDe: number } & LimiarFonte,
  },
} as const;

/**
 * Chave VITE_ALERTAS_SEM_FONTE. Padrão `true` (qualquer valor diferente de "false"): todos os alertas, como sempre foram.
 * `false` desliga SÓ os alertas cujo limiar tem `fonte: null`; os alertas com fonte continuam. O registro dos sinais não muda.
 */
export function alertasSemFonteAtivos(valor: string | undefined = import.meta.env?.VITE_ALERTAS_SEM_FONTE): boolean {
  return valor !== 'false';
}

/** Um limiar vale quando tem fonte registrada ou quando os alertas sem fonte estão ligados. */
export function limiarAtivo(l: LimiarFonte, semFonteAtivos: boolean): boolean {
  return l.fonte !== null || semFonteAtivos;
}
