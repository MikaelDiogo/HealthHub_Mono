import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FilaPaciente } from '../../fila/domain/fila-paciente.entity';
import { Paciente } from '../domain/paciente.entity';
import { IPatientsRepository } from '../domain/patients-repository.interface';

@Injectable()
export class TypeormPatientsRepository implements IPatientsRepository {
  constructor(
    @InjectRepository(Paciente)
    private readonly repo: Repository<Paciente>,
    private readonly dataSource: DataSource,
  ) {}

  findByCpf(cpf: string): Promise<Paciente | null> {
    return this.repo.findOneBy({ cpf });
  }

  findById(id: string): Promise<Paciente | null> {
    return this.repo.findOneBy({ id });
  }

  findByIdWithVitals(id: string): Promise<Paciente | null> {
    return this.repo.findOne({ where: { id }, relations: ['sinaisVitais'] });
  }

  findAllWithVitals(ativo?: boolean): Promise<Paciente[]> {
    return this.repo.find({
      where: ativo === undefined ? {} : { ativo },
      relations: ['sinaisVitais'],
      order: { sinaisVitais: { created_at: 'DESC' } },
    });
  }

  async createAndSave(data: Partial<Paciente>): Promise<Paciente> {
    const patient = this.repo.create(data);
    await this.repo.save(patient);
    return patient;
  }

  save(paciente: Paciente): Promise<Paciente> {
    return this.repo.save(paciente);
  }

  async saveSincronizandoFila(paciente: Paciente): Promise<{ paciente: Paciente; filaAtualizada: number }> {
    return this.dataSource.transaction(async (manager) => {
      const salvo = await manager.save(Paciente, paciente);
      const r = await manager.update(FilaPaciente, { paciente_id: salvo.id }, { nome: salvo.nome_completo, idade: salvo.idade ?? null });
      return { paciente: salvo, filaAtualizada: r.affected ?? 0 };
    });
  }

  async setAtivo(id: string, ativo: boolean): Promise<void> {
    await this.repo.update({ id }, { ativo });
  }
}
