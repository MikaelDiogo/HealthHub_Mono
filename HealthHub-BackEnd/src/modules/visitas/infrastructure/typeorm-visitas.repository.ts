import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Visita } from '../domain/visita.entity';
import { IVisitasRepository } from '../domain/visitas-repository.interface';

@Injectable()
export class TypeormVisitasRepository implements IVisitasRepository {
  constructor(
    @InjectRepository(Visita)
    private readonly repo: Repository<Visita>,
  ) {}

  async create(data: Partial<Visita>): Promise<Visita> {
    const visita = this.repo.create(data);
    return this.repo.save(visita);
  }

  async save(visita: Visita): Promise<Visita> {
    return this.repo.save(visita);
  }

  async findById(id: string): Promise<Visita | null> {
    return this.repo.findOne({ where: { id }, relations: ['paciente'] });
  }

  async findActiveByPacienteId(pacienteId: string): Promise<Visita | null> {
    return this.repo.findOne({
      where: { paciente_id: pacienteId, alta: IsNull(), desfecho: 'Em Atendimento' },
    });
  }

  async findAllByPacienteId(pacienteId: string): Promise<Visita[]> {
    return this.repo.find({
      where: { paciente_id: pacienteId },
      order: { chegada: 'DESC' },
    });
  }

  async countByPacienteId(pacienteId: string): Promise<number> {
    return this.repo.count({ where: { paciente_id: pacienteId } });
  }
}
