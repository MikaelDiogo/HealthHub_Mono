import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { CreateFilaDto } from '../presentation/dtos/create-fila.dto';

@Injectable()
export class CreateFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
  ) {}

  async execute(data: CreateFilaDto): Promise<FilaPaciente> {
    const jaExiste = await this.filaRepository.findByPacienteId(data.paciente_id);

    if (jaExiste) {
      throw new BadRequestException({ error: 'Paciente já está na fila de atendimento.' });
    }

    return this.filaRepository.createAndSave({ ...data });
  }
}
