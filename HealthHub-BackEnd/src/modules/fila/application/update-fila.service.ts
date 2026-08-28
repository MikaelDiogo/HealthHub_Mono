import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { UpdateFilaDto } from '../presentation/dtos/update-fila.dto';

@Injectable()
export class UpdateFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
  ) {}

  async execute(id: string, data: UpdateFilaDto): Promise<FilaPaciente> {
    const entrada = await this.filaRepository.findById(id);

    if (!entrada) {
      throw new NotFoundException({ error: 'Entrada na fila não encontrada.' });
    }

    entrada.status = data.status;
    if (data.gravidade !== undefined) entrada.gravidade = data.gravidade;

    return this.filaRepository.save(entrada);
  }
}
