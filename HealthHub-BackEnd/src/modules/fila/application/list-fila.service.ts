import { Inject, Injectable } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';

@Injectable()
export class ListFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
  ) {}

  execute(): Promise<FilaPaciente[]> {
    return this.filaRepository.findAll();
  }
}
