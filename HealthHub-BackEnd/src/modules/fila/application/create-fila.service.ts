import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { CreateFilaDto } from '../presentation/dtos/create-fila.dto';
import { CreateVisitaService } from '../../visitas/application/create-visita.service';

@Injectable()
export class CreateFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
    private readonly createVisita: CreateVisitaService,
  ) {}

  async execute(data: CreateFilaDto): Promise<FilaPaciente> {
    const jaExiste = await this.filaRepository.findByPacienteId(data.paciente_id);

    if (jaExiste) {
      throw new BadRequestException({ error: 'Paciente já está na fila de atendimento.' });
    }

    const entrada = await this.filaRepository.createAndSave({ ...data });

    // Abre automaticamente uma visita ao admitir na fila
    await this.createVisita.execute(data.paciente_id, data.motivo_visita);

    return entrada;
  }
}
