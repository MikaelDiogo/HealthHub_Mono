import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { UpdateFilaDto } from '../presentation/dtos/update-fila.dto';
import { CloseVisitaService } from '../../visitas/application/close-visita.service';
import { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../../patients/domain/patients-repository.interface';
import { ISinaisVitaisRepository, SINAIS_VITAIS_REPOSITORY } from '../../sinais-vitais/domain/sinais-vitais-repository.interface';

const ALTA_STATUSES = ['Alta'];

@Injectable()
export class UpdateFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
    @Inject(SINAIS_VITAIS_REPOSITORY)
    private readonly sinaisVitaisRepository: ISinaisVitaisRepository,
    private readonly closeVisita: CloseVisitaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async execute(id: string, data: UpdateFilaDto, requesterRole: string): Promise<FilaPaciente> {
    const entrada = await this.filaRepository.findById(id);

    if (!entrada) {
      throw new NotFoundException({ error: 'Entrada na fila não encontrada.' });
    }

    if (data.gravidade !== undefined) {
      // A classificação de risco (Protocolo de Manchester) é atribuição exclusiva
      // do enfermeiro e depende de sinais vitais já registrados para o paciente.
      if (requesterRole !== 'enfermeiro') {
        throw new ForbiddenException({ error: 'Apenas o enfermeiro pode atribuir a categoria de risco.' });
      }
      const sinais = await this.sinaisVitaisRepository.findLatestByPatient(entrada.paciente_id, 1);
      if (sinais.length === 0) {
        throw new BadRequestException({ error: 'Registre os sinais vitais do paciente antes de classificar o risco.' });
      }
      entrada.gravidade = data.gravidade;
    }

    entrada.status = data.status;

    const updated = await this.filaRepository.save(entrada);

    // Fecha a visita automaticamente quando o paciente recebe alta
    if (ALTA_STATUSES.includes(data.status)) {
      await this.closeVisita.execute(
        entrada.paciente_id,
        'Alta',
        entrada.gravidade,
      );
      await this.patientsRepository.setAtivo(entrada.paciente_id, false);
    }

    this.realtimeGateway.broadcastFilaChanged();

    return updated;
  }
}
