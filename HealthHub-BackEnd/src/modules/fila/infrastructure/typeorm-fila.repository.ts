import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { IFilaRepository } from '../domain/fila-repository.interface';

@Injectable()
export class TypeormFilaRepository implements IFilaRepository {
  constructor(
    @InjectRepository(FilaPaciente)
    private readonly repo: Repository<FilaPaciente>,
  ) {}

  findAll(): Promise<FilaPaciente[]> {
    return this.repo.find({ order: { created_at: 'ASC' } });
  }

  findById(id: string): Promise<FilaPaciente | null> {
    return this.repo.findOneBy({ id });
  }

  findByPacienteId(pacienteId: string): Promise<FilaPaciente | null> {
    return this.repo.findOneBy({ paciente_id: pacienteId });
  }

  async createAndSave(data: Partial<FilaPaciente>): Promise<FilaPaciente> {
    const entrada = this.repo.create(data);
    await this.repo.save(entrada);
    return entrada;
  }

  save(entrada: FilaPaciente): Promise<FilaPaciente> {
    return this.repo.save(entrada);
  }

  async remove(entrada: FilaPaciente): Promise<void> {
    await this.repo.remove(entrada);
  }
}
