import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { CloseVisitaService } from '../../visitas/application/close-visita.service';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../../patients/domain/patients-repository.interface';
import { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';

/**
 * Alta clínica: fecha a visita em aberto, marca o paciente como inativo
 * (some da listagem padrão, mas cadastro e histórico permanecem) e remove
 * a entrada da esteira de cuidado.
 */
@Injectable()
export class DischargeFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
    private readonly closeVisita: CloseVisitaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async execute(id: string): Promise<void> {
    const entrada = await this.filaRepository.findById(id);

    if (!entrada) {
      throw new NotFoundException({ error: 'Entrada na fila não encontrada.' });
    }

    await this.closeVisita.execute(entrada.paciente_id, 'Alta', entrada.gravidade);
    await this.patientsRepository.setAtivo(entrada.paciente_id, false);
    await this.filaRepository.remove(entrada);

    this.realtimeGateway.broadcastFilaChanged();
  }
}
