import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Paciente } from '../domain/paciente.entity';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../domain/patients-repository.interface';
import { UpdatePatientDto } from '../presentation/dtos/update-patient.dto';

@Injectable()
export class UpdatePatientService {
  constructor(
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
  ) {}

  async execute(id: string, data: UpdatePatientDto): Promise<Paciente> {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new BadRequestException({ error: 'Paciente não encontrado.' });
    }

    // Aplica apenas os campos presentes (partial update)
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (patient as unknown as Record<string, unknown>)[key] = value;
      }
    }

    return this.patientsRepository.save(patient);
  }
}
