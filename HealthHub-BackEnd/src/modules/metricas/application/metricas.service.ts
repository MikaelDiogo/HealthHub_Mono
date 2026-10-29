import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Visita } from '../../visitas/domain/visita.entity';
import { FilaPaciente } from '../../fila/domain/fila-paciente.entity';
import { SinaisVitais } from '../../sinais-vitais/domain/sinais-vitais.entity';
import { calcularMetricas, type SinaisInput } from './calcular-metricas';

const DIA = 24 * 60 * 60 * 1000;

@Injectable()
export class MetricasService {
  constructor(
    @InjectRepository(Visita) private readonly visitas: Repository<Visita>,
    @InjectRepository(FilaPaciente) private readonly fila: Repository<FilaPaciente>,
    @InjectRepository(SinaisVitais) private readonly sinais: Repository<SinaisVitais>,
  ) {}

  async execute() {
    const agora = new Date();
    // 60 dias: os 30 do período + até 30 antes, para achar a visita anterior de uma readmissão
    const [visitas, fila] = await Promise.all([
      this.visitas.find({ where: { chegada: MoreThanOrEqual(new Date(agora.getTime() - 60 * DIA)) } }),
      this.fila.find(),
    ]);

    const ids = fila.map((f) => f.paciente_id);
    const leituras = ids.length
      ? await this.sinais.find({ where: { patient_id: In(ids) }, order: { created_at: 'DESC' } })
      : [];
    const ultimosSinais: Record<string, SinaisInput> = {};
    for (const l of leituras) if (!ultimosSinais[l.patient_id]) ultimosSinais[l.patient_id] = l;

    return calcularMetricas({ visitas, fila, ultimosSinais, agora });
  }
}
