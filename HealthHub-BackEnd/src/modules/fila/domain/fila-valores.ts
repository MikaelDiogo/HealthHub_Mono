// Valores que o sistema já grava hoje na esteira (conferidos em CareContext.tsx, MobileTriage e calcular-metricas.ts).
// Não define transições entre status: essa regra clínica ainda não foi decidida.
export const STATUS_ESTEIRA = [
  'Aguardando Triagem',
  'Em Triagem (Enfermeiro)',
  'Aguardando Atendimento',
  'Em Consulta (Médico)',
  'Em Observação',
] as const;

/** "Alta" só chega pelo PUT para ser recusada a quem não é médico (ver UpdateFilaService). */
export const STATUS_ATUALIZACAO = [...STATUS_ESTEIRA, 'Alta'] as const;

export const GRAVIDADES_RISCO = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'] as const;
