import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SinaisVitais } from '../domain/sinais-vitais.entity';
import { ISinaisVitaisRepository } from '../domain/sinais-vitais-repository.interface';

@Injectable()
export class TypeormSinaisVitaisRepository implements ISinaisVitaisRepository {
  constructor(
    @InjectRepository(SinaisVitais)
    private readonly repo: Repository<SinaisVitais>,
  ) {}

  async createAndSave(data: Partial<SinaisVitais>): Promise<SinaisVitais> {
    const sinais = this.repo.create(data);
    await this.repo.save(sinais);
    return sinais;
  }

  findAllByPatient(patientId: string): Promise<SinaisVitais[]> {
    return this.repo.find({
      where: { patient_id: patientId },
      order: { created_at: 'DESC' },
    });
  }

  findLatestByPatient(patientId: string, limit: number): Promise<SinaisVitais[]> {
    return this.repo.find({
      where: { patient_id: patientId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
