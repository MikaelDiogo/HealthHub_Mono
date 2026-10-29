import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visita } from '../../visitas/domain/visita.entity';

export interface ResumoHistorico {
  paciente_id: string;
  total: number;
  ultima: {
    chegada: Date;
    alta: Date | null;
    desfecho: string;
    gravidade_manchester: string | null;
    motivo_visita: string | null;
  };
}

// Resumo do histórico de visitas de todos os pacientes num único pedido:
// alimenta a readmissão (quantas vezes veio, como foi a última) sem N chamadas.
@Injectable()
export class HistoricoPacientesService {
  constructor(@InjectRepository(Visita) private readonly visitas: Repository<Visita>) {}

  async execute(): Promise<Record<string, ResumoHistorico>> {
    const todas = await this.visitas.find({ order: { chegada: 'DESC' } });
    const resumo: Record<string, ResumoHistorico> = {};
    for (const v of todas) {
      const r = resumo[v.paciente_id];
      if (r) { r.total++; continue; }
      resumo[v.paciente_id] = {
        paciente_id: v.paciente_id,
        total: 1,
        ultima: {
          chegada: v.chegada,
          alta: v.alta ?? null,
          desfecho: v.desfecho,
          gravidade_manchester: v.gravidade_manchester ?? null,
          motivo_visita: v.motivo_visita ?? null,
        },
      };
    }
    return resumo;
  }
}
