import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';
import { RegistrarEventoService, UsuarioEvento } from '../../eventos/application/registrar-evento.service';

@Injectable()
export class DeleteFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly eventos: RegistrarEventoService,
  ) {}

  async execute(id: string, usuario?: UsuarioEvento): Promise<void> {
    const entrada = await this.filaRepository.findById(id);

    if (!entrada) {
      throw new NotFoundException({ error: 'Entrada na fila não encontrada.' });
    }

    await this.filaRepository.remove(entrada);

    await this.eventos.registrar({
      tipo: 'removido_da_fila',
      paciente_id: entrada.paciente_id,
      fila_id: entrada.id,
      status_anterior: entrada.status,
      gravidade: entrada.gravidade,
      usuario,
    });

    this.realtimeGateway.broadcastFilaChanged();
  }
}
