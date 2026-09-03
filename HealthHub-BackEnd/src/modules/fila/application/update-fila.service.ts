import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { UpdateFilaDto } from '../presentation/dtos/update-fila.dto';
import { CloseVisitaService } from '../../visitas/application/close-visita.service';

const ALTA_STATUSES = ['Alta'];

@Injectable()
export class UpdateFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
    private readonly closeVisita: CloseVisitaService,
  ) {}

  async execute(id: string, data: UpdateFilaDto): Promise<FilaPaciente> {
    const entrada = await this.filaRepository.findById(id);

    if (!entrada) {
      throw new NotFoundException({ error: 'Entrada na fila não encontrada.' });
    }

    entrada.status = data.status;
    if (data.gravidade !== undefined) entrada.gravidade = data.gravidade;

    const updated = await this.filaRepository.save(entrada);

    // Fecha a visita automaticamente quando o paciente recebe alta
    if (ALTA_STATUSES.includes(data.status)) {
      await this.closeVisita.execute(
        entrada.paciente_id,
        'Alta',
        entrada.gravidade,
      );
    }

    return updated;
  }
}
