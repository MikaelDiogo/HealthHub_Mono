// Limiares de alerta de sinais vitais, em um só lugar, cada um com a sua FONTE.
// Rodada 3 (05/11/2026): todos os limiares passam a ter fonte documental; a temperatura crítica mudou de > 38,5 para >= 39,1 °C
// e a pressão arterial passou a ter alerta (PAS/PAD). Os valores vêm do pedido da rodada (documentos citados abaixo) e não foram escolhidos pelo desenvolvedor.
// Registro completo: evidencias_tcc/rodada_final_3/limiares_com_fonte.md.
//
// `fonte`: documento que sustenta o NÚMERO (não o rótulo: "atenção" e "crítico" são uma convenção do projeto, as fontes usam categorias e pontos próprios).
// `null` = SEM fonte clínica registrada (hoje nenhum limiar está assim; o mecanismo da chave continua e é provado com um limiar sintético nos testes).
// O backend tem uma cópia dos limiares de "crítico" (HealthHub-BackEnd/src/config/limiares-sinais-vitais.ts): mantenha as duas iguais.
export const FONTE_POP = 'POP.HC-UFTM-DENF.003 v6 (HC-UFTM/Ebserh, 2025)';
export const FONTE_NEWS2 = 'NEWS2 (Royal College of Physicians, 2017)';
export const FONTE_SIRS = 'Critérios de SIRS (Bone et al., Chest, 1992; consenso ACCP/SCCM)';
export const FONTE_DIRETRIZ_HAS = 'Diretrizes Brasileiras de Hipertensão Arterial 2020 (SBC), Quadro 3.4';
export const FONTE_LINHA_CUIDADO_HAS = 'Linha de cuidado do adulto com hipertensão arterial sistêmica (Ministério da Saúde)';
export const FONTE_CRISE_HIPERTENSIVA = 'Posicionamento Brasileiro sobre Crise Hipertensiva (SBC, Arq Bras Cardiol, 2020)';

export interface LimiarFonte {
  /** Documento que sustenta o valor; null = sem fonte clínica registrada */
  fonte: string | null;
}

export const LIMIARES_SINAIS_VITAIS = {
  spo2: {
    // < 92: NEWS2, escala 1 (SpO2 ≤ 91 vale 3 pontos). O POP classifica 91% como hipóxia leve (Anexo H); o rótulo "crítico" é do projeto.
    critico: { abaixoDe: 92, fonte: `${FONTE_NEWS2}, escala 1: SpO2 ≤ 91% vale 3 pontos` } as { abaixoDe: number } & LimiarFonte,
    // < 95: faixa normal de 95 a 100% (Anexo H do POP); NEWS2 pontua 94 a 95%. O corte é um pouco mais estrito que o do NEWS2.
    atencao: { abaixoDe: 95, fonte: `${FONTE_POP}, Anexo H: faixa normal 95 a 100%; ${FONTE_NEWS2}: 94 a 95% vale 1 ponto` } as { abaixoDe: number } & LimiarFonte,
  },
  frequenciaCardiaca: {
    // < 60 ou > 100: faixa de referência do adulto, 60 a 100 bpm (Anexo E do POP)
    critico: { abaixoDe: 60, acimaDe: 100, fonte: `${FONTE_POP}, Anexo E: faixa de referência do adulto, 60 a 100 bpm` } as { abaixoDe: number; acimaDe: number } & LimiarFonte,
    // > 90: SIRS (FC > 90 bpm) e NEWS2 (FC 91 a 110 vale 1 ponto)
    atencao: { acimaDe: 90, fonte: `${FONTE_SIRS}: FC > 90 bpm; ${FONTE_NEWS2}: FC 91 a 110 vale 1 ponto` } as { acimaDe: number } & LimiarFonte,
  },
  temperatura: {
    // >= 39,1 °C: febre alta, 39,1 a 40,0 °C (Anexo F do POP); NEWS2: >= 39,1 °C vale 2 pontos. Antes da rodada 3 era > 38,5 (sem fonte).
    critico: { aPartirDe: 39.1, fonte: `${FONTE_POP}, Anexo F: febre alta, 39,1 a 40,0 °C; ${FONTE_NEWS2}: >= 39,1 °C vale 2 pontos` } as { aPartirDe: number } & LimiarFonte,
    // >= 37,8 °C: início da febre baixa (Anexo F do POP)
    atencao: { aPartirDe: 37.8, fonte: `${FONTE_POP}, Anexo F: início da febre baixa, a partir de 37,8 °C` } as { aPartirDe: number } & LimiarFonte,
  },
  // Pressão arterial (mmHg). PAS = sistólica; PAD = diastólica. Crítico: PAS <= 90 ou PAS >= 180 ou PAD >= 120.
  // Atenção: PAS de 91 a 100 ou PAS >= 140 ou PAD >= 90. Um alerta reage a UMA leitura e significa "pressão elevada/baixa", e não diagnóstico.
  pressaoArterial: {
    critico: {
      pasAte: 90, pasDe: 180, padDe: 120,
      fonte: `PAS ≤ 90: ${FONTE_NEWS2} (3 pontos) e ${FONTE_POP}, Anexo A. PAS ≥ 180 ou PAD ≥ 120: crise hipertensiva, ${FONTE_CRISE_HIPERTENSIVA}; ${FONTE_LINHA_CUIDADO_HAS}; ${FONTE_POP}, Anexo D (hipertensão grave)`,
      // As três redações do mesmo conceito: SBC "PAS ≥ 180 e/ou PAD ≥ 120"; Ministério da Saúde "acima de 180 e acima de 120"; tabela do POP ">180 e/ou >120".
      // O projeto usa a redação do Posicionamento da SBC (>=, "ou"); a diferença de redação (> x >=; "e" x "ou") foi registrada, não "harmonizada".
      fonte_pressao_critica: 'SBC (Posicionamento sobre Crise Hipertensiva, 2020): PAS >= 180 e/ou PAD >= 120; Ministério da Saúde (Linha de cuidado HAS): acima de 180 e acima de 120; POP Anexo D: >180 e/ou >120. Adotada a redação da SBC.',
    } as { pasAte: number; pasDe: number; padDe: number } & LimiarFonte & { fonte_pressao_critica: string },
    atencao: {
      pasDe: 91, pasAte: 100, pasAcimaDe: 140, padDe: 90,
      fonte: `PAS 91 a 100: ${FONTE_NEWS2} (2 pontos) e ${FONTE_POP}, Anexo A. PAS ≥ 140 ou PAD ≥ 90: ${FONTE_DIRETRIZ_HAS} e ${FONTE_LINHA_CUIDADO_HAS}`,
    } as { pasDe: number; pasAte: number; pasAcimaDe: number; padDe: number } & LimiarFonte,
  },
} as const;

/**
 * Chave VITE_ALERTAS_SEM_FONTE. Padrão `true` (qualquer valor diferente de "false"): todos os alertas.
 * `false` desliga SÓ os alertas cujo limiar tem `fonte: null`; os alertas com fonte continuam. O registro dos sinais não muda.
 * Desde a rodada 3 nenhum limiar real tem `fonte: null`, então hoje a chave não desliga nenhum alerta real (o mecanismo segue testado com limiar sintético).
 */
export function alertasSemFonteAtivos(valor: string | undefined = import.meta.env?.VITE_ALERTAS_SEM_FONTE): boolean {
  return valor !== 'false';
}

/** Um limiar vale quando tem fonte registrada ou quando os alertas sem fonte estão ligados. */
export function limiarAtivo(l: LimiarFonte, semFonteAtivos: boolean): boolean {
  return l.fonte !== null || semFonteAtivos;
}
