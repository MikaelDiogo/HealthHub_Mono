// Cópia dos limiares de "crítico" usados no backend (lista de atenção/métricas). VALORES IDÊNTICOS aos do frontend
// (HealthHub-Project/src/config/limiaresSinaisVitais.ts); nenhum valor clínico foi escolhido ou alterado.
// `fonte: null` = não há fonte clínica registrada.
export const LIMIARES_CRITICOS = {
  spo2: { criticoAbaixoDe: 92, fonte: null as string | null },
  frequenciaCardiaca: { criticoAcimaDe: 100, criticoAbaixoDe: 60, fonte: null as string | null },
  temperatura: { criticoAcimaDe: 38.5, fonte: null as string | null },
} as const;
