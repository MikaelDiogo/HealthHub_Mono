// Limiares de "crítico" usados no backend (lista de "atenção agora" do painel). VALORES IDÊNTICOS aos do frontend
// (HealthHub-Project/src/config/limiaresSinaisVitais.ts, que traz também os limiares de "atenção"). Mantenha as duas cópias iguais.
// Rodada 3 (05/11/2026): todos os limiares têm fonte documental; temperatura crítica agora é >= 39,1 °C (antes > 38,5) e a pressão
// arterial passou a ter alerta crítico. Os valores vêm do pedido da rodada e não foram escolhidos pelo desenvolvedor.
// `fonte`: documento que sustenta o NÚMERO (os rótulos "atenção"/"crítico" são convenção do projeto); `null` = sem fonte clínica registrada.
export const FONTE_POP = 'POP.HC-UFTM-DENF.003 v6 (HC-UFTM/Ebserh, 2025)';
export const FONTE_NEWS2 = 'NEWS2 (Royal College of Physicians, 2017)';
export const FONTE_CRISE_HIPERTENSIVA = 'Posicionamento Brasileiro sobre Crise Hipertensiva (SBC, Arq Bras Cardiol, 2020)';
export const FONTE_LINHA_CUIDADO_HAS = 'Linha de cuidado do adulto com hipertensão arterial sistêmica (Ministério da Saúde)';

export interface LimiarFonte {
  fonte: string | null;
}

export const LIMIARES_CRITICOS = {
  // < 92: NEWS2, escala 1 (SpO2 ≤ 91 vale 3 pontos)
  spo2: { abaixoDe: 92, fonte: `${FONTE_NEWS2}, escala 1: SpO2 ≤ 91% vale 3 pontos` } as { abaixoDe: number } & LimiarFonte,
  // < 60 ou > 100: faixa de referência do adulto, 60 a 100 bpm (Anexo E do POP)
  frequenciaCardiaca: { abaixoDe: 60, acimaDe: 100, fonte: `${FONTE_POP}, Anexo E: faixa de referência do adulto, 60 a 100 bpm` } as { abaixoDe: number; acimaDe: number } & LimiarFonte,
  // >= 39,1 °C: febre alta, 39,1 a 40,0 °C (Anexo F do POP); NEWS2: >= 39,1 °C vale 2 pontos
  temperatura: { aPartirDe: 39.1, fonte: `${FONTE_POP}, Anexo F: febre alta, 39,1 a 40,0 °C; ${FONTE_NEWS2}: >= 39,1 °C vale 2 pontos` } as { aPartirDe: number } & LimiarFonte,
  // PAS <= 90 ou PAS >= 180 ou PAD >= 120 (mmHg)
  pressaoArterial: {
    pasAte: 90, pasDe: 180, padDe: 120,
    fonte: `PAS ≤ 90: ${FONTE_NEWS2} (3 pontos) e ${FONTE_POP}, Anexo A. PAS ≥ 180 ou PAD ≥ 120: crise hipertensiva, ${FONTE_CRISE_HIPERTENSIVA}; ${FONTE_LINHA_CUIDADO_HAS}; ${FONTE_POP}, Anexo D (hipertensão grave)`,
    fonte_pressao_critica: 'SBC (Posicionamento sobre Crise Hipertensiva, 2020): PAS >= 180 e/ou PAD >= 120; Ministério da Saúde (Linha de cuidado HAS): acima de 180 e acima de 120; POP Anexo D: >180 e/ou >120. Adotada a redação da SBC.',
  } as { pasAte: number; pasDe: number; padDe: number } & LimiarFonte & { fonte_pressao_critica: string },
} as const;

/**
 * Chave ALERTAS_SEM_FONTE. Padrão `true` (qualquer valor diferente de "false"): todos os alertas.
 * `false` desliga SÓ os alertas cujo limiar tem `fonte: null`; os com fonte continuam. O registro dos sinais não muda.
 * Desde a rodada 3 nenhum limiar real tem `fonte: null`: hoje a chave não desliga nenhum alerta real (o mecanismo segue testado com limiar sintético).
 */
export function alertasSemFonteAtivos(env: Record<string, string | undefined> = process.env): boolean {
  return env.ALERTAS_SEM_FONTE !== 'false';
}

/** Um limiar vale quando tem fonte registrada ou quando os alertas sem fonte estão ligados. */
export function limiarAtivo(l: LimiarFonte, semFonteAtivos: boolean): boolean {
  return l.fonte !== null || semFonteAtivos;
}
