import { Inject, Injectable } from '@nestjs/common';
import { EVENTOS_REPOSITORY, EventoDetalhado, IEventosRepository } from '../domain/eventos-repository.interface';

@Injectable()
export class ListarEventosPacienteService {
  constructor(
    @Inject(EVENTOS_REPOSITORY)
    private readonly repository: IEventosRepository,
  ) {}

  /** Últimos 200 eventos do paciente, do mais recente para o mais antigo. */
  execute(pacienteId: string): Promise<EventoDetalhado[]> {
    return this.repository.listarPorPaciente(pacienteId, 200);
  }
}
