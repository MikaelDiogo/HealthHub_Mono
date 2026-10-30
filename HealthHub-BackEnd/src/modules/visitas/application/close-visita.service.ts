import { Inject, Injectable } from '@nestjs/common';
import { Visita } from '../domain/visita.entity';
import { VISITAS_REPOSITORY, IVisitasRepository } from '../domain/visitas-repository.interface';

@Injectable()
export class CloseVisitaService {
  constructor(
    @Inject(VISITAS_REPOSITORY)
    private readonly visitasRepository: IVisitasRepository,
  ) {}

  async execute(
    pacienteId: string,
    desfecho: string = 'Alta',
    classificacaoRisco?: string,
    observacoes?: string,
  ): Promise<Visita | null> {
    const visita = await this.visitasRepository.findActiveByPacienteId(pacienteId);
    if (!visita) return null;

    visita.alta = new Date();
    visita.desfecho = desfecho;
    if (classificacaoRisco) visita.classificacao_risco = classificacaoRisco;
    if (observacoes) visita.observacoes = observacoes;

    return this.visitasRepository.save(visita);
  }
}
