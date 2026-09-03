import { Inject, Injectable } from '@nestjs/common';
import { Visita } from '../domain/visita.entity';
import { VISITAS_REPOSITORY, IVisitasRepository } from '../domain/visitas-repository.interface';

@Injectable()
export class ListVisitasByPatientService {
  constructor(
    @Inject(VISITAS_REPOSITORY)
    private readonly visitasRepository: IVisitasRepository,
  ) {}

  async execute(pacienteId: string): Promise<{ visitas: Visita[]; total: number }> {
    const visitas = await this.visitasRepository.findAllByPacienteId(pacienteId);
    return { visitas, total: visitas.length };
  }
}
