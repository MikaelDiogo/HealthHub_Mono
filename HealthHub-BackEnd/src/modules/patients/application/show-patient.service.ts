import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Paciente } from '../domain/paciente.entity';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../domain/patients-repository.interface';

@Injectable()
export class ShowPatientService {
  constructor(
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
  ) {}

  async execute(id: string): Promise<Paciente> {
    const patient = await this.patientsRepository.findByIdWithVitals(id);

    if (!patient) {
      throw new NotFoundException({ error: 'Paciente não encontrado no HealthHub.' });
    }

    return patient;
  }
}
