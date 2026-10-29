// Rótulos do registro de rastreabilidade da esteira (quem fez o quê e quando).
// São descrições de ações do sistema; não representam categorias nem critérios de protocolo clínico.

export interface EventoApi {
  id?: string;
  tipo: string;
  status_anterior?: string | null;
  status_novo?: string | null;
  gravidade?: string | null;
  justificativa?: string | null;
  usuario_role?: string | null;
  usuario_nome?: string | null;
  criado_em?: string;
}

export const AVISO_RASTREABILIDADE =
  'Registro de rastreabilidade das ações na esteira. A cor é escolhida manualmente pelo enfermeiro; o sistema não classifica, não sugere prioridade e não controla prazos. Não é o Protocolo de Manchester.';

const ROTULOS: Record<string, string> = {
  admitido: 'Admitido na esteira',
  sinais_registrados: 'Sinais vitais registrados',
  triagem_iniciada: 'Triagem iniciada',
  consulta_iniciada: 'Consulta iniciada (chamada)',
  observacao_iniciada: 'Enviado à observação',
  status_alterado: 'Etapa alterada',
  alta: 'Alta',
  removido_da_fila: 'Removido da esteira',
};

export function rotuloEvento(e: Pick<EventoApi, 'tipo' | 'gravidade'>): string {
  if (e.tipo === 'classificado') return e.gravidade ? `Cor registrada pelo enfermeiro: ${e.gravidade}` : 'Cor registrada pelo enfermeiro';
  return ROTULOS[e.tipo] ?? e.tipo;
}

const PERFIS: Record<string, string> = { enfermeiro: 'Enfermagem', medico: 'Médico', recepcionista: 'Recepção' };

export function rotuloPerfil(role?: string | null): string {
  return role ? PERFIS[role] ?? role : 'autor não registrado';
}
