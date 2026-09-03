import { Inject, Injectable } from '@nestjs/common';
import { Visita } from '../domain/visita.entity';
import { VISITAS_REPOSITORY, IVisitasRepository } from '../domain/visitas-repository.interface';

@Injectable()
export class CreateVisitaService {
  constructor(
    @Inject(VISITAS_REPOSITORY)
    private readonly visitasRepository: IVisitasRepository,
  ) {}

  async execute(pacienteId: string, motivoVisita?: string): Promise<Visita> {
    // Reutiliza visita ativa existente se houver (evita duplicata)
    const ativa = await this.visitasRepository.findActiveByPacienteId(pacienteId);
    if (ativa) return ativa;

    return this.visitasRepository.create({
      paciente_id: pacienteId,
      chegada: new Date(),
      desfecho: 'Em Atendimento',
      motivo_visita: motivoVisita,
    });
  }
}
