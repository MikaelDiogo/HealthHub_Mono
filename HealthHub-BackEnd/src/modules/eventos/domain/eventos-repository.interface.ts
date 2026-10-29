import type { FilaEvento } from './fila-evento.entity';

export const EVENTOS_REPOSITORY = Symbol('EVENTOS_REPOSITORY');

export type NovoEvento = Omit<FilaEvento, 'id' | 'criado_em'>;

export interface EventoDetalhado extends FilaEvento {
  usuario_nome: string | null;
}

export interface IEventosRepository {
  /** Grava o evento; se `visita_id` não vier, usa a visita ativa do paciente (se houver). */
  registrar(evento: NovoEvento): Promise<void>;
  /** Mais recentes primeiro, com o nome do profissional quando o usuário ainda existe. */
  listarPorPaciente(pacienteId: string, limite: number): Promise<EventoDetalhado[]>;
}
