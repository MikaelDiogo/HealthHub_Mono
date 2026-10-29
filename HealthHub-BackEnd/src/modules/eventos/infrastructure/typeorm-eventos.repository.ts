import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FilaEvento } from '../domain/fila-evento.entity';
import { EventoDetalhado, IEventosRepository, NovoEvento } from '../domain/eventos-repository.interface';
import { Visita } from '../../visitas/domain/visita.entity';

@Injectable()
export class TypeormEventosRepository implements IEventosRepository {
  constructor(
    @InjectRepository(FilaEvento)
    private readonly repo: Repository<FilaEvento>,
    @InjectRepository(Visita)
    private readonly visitas: Repository<Visita>,
  ) {}

  async registrar(evento: NovoEvento): Promise<void> {
    let visitaId = evento.visita_id ?? null;
    if (!visitaId) {
      const ativa = await this.visitas.findOne({ where: { paciente_id: evento.paciente_id, alta: IsNull() }, order: { chegada: 'DESC' } });
      visitaId = ativa?.id ?? null;
    }
    await this.repo.insert({ ...evento, visita_id: visitaId });
  }

  async listarPorPaciente(pacienteId: string, limite: number): Promise<EventoDetalhado[]> {
    const linhas = await this.repo
      .createQueryBuilder('e')
      .leftJoin('users', 'u', 'u.id = e.usuario_id')
      .select(['e.*', 'u.nome AS usuario_nome'])
      .where('e.paciente_id = :pacienteId', { pacienteId })
      .orderBy('e.criado_em', 'DESC')
      .limit(limite)
      .getRawMany();
    return linhas as EventoDetalhado[];
  }
}
