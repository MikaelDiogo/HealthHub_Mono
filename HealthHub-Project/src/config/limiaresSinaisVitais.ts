// Limiares de alerta de sinais vitais, em um só lugar (Opção A). VALORES IDÊNTICOS aos que já existiam em
// utils/vitalStatus.ts; nenhum valor clínico foi escolhido ou alterado aqui.
// `fonte: null` = não há fonte clínica registrada. Preencha `fonte` (e, se for o caso, os valores) quando o autor informar.
// O backend tem uma cópia (HealthHub-BackEnd/src/config/limiares-sinais-vitais.ts): mantenha as duas iguais.
export const LIMIARES_SINAIS_VITAIS = {
  spo2: { criticoAbaixoDe: 92, atencaoAbaixoDe: 95, fonte: null as string | null },
  frequenciaCardiaca: { criticoAcimaDe: 100, criticoAbaixoDe: 60, atencaoAcimaDe: 90, fonte: null as string | null },
  temperatura: { criticoAcimaDe: 38.5, atencaoAPartirDe: 37.8, fonte: null as string | null },
  // Pressão arterial: SEM limiar definido (nenhum alerta) até o autor informar valores e fonte.
  pressaoArterial: {
    sistolica: null as null | { criticoAcimaDe?: number; criticoAbaixoDe?: number },
    diastolica: null as null | { criticoAcimaDe?: number; criticoAbaixoDe?: number },
    fonte: null as string | null,
  },
} as const;
