import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SinaisVitais } from '../domain/sinais-vitais.entity';
import { ISinaisVitaisRepository, SINAIS_VITAIS_REPOSITORY } from '../domain/sinais-vitais-repository.interface';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../../patients/domain/patients-repository.interface';

@Injectable()
export class GetCurrentVitalsService {
  constructor(
    @Inject(SINAIS_VITAIS_REPOSITORY)
    private readonly sinaisRepository: ISinaisVitaisRepository,
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
  ) {}

  async execute(patientId: string): Promise<SinaisVitais[]> {
    const patientExists = await this.patientsRepository.findById(patientId);

    if (!patientExists) {
      throw new BadRequestException({ error: 'Paciente não encontrado.' });
    }

    return this.sinaisRepository.findLatestByPatient(patientId, 12);
  }
}
