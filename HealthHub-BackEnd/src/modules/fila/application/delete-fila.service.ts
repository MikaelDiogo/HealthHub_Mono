import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';

@Injectable()
export class DeleteFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async execute(id: string): Promise<void> {
    const entrada = await this.filaRepository.findById(id);

    if (!entrada) {
      throw new NotFoundException({ error: 'Entrada na fila não encontrada.' });
    }

    await this.filaRepository.remove(entrada);

    this.realtimeGateway.broadcastFilaChanged();
  }
}
