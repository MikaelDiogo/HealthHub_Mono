import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Paciente } from '../domain/paciente.entity';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../domain/patients-repository.interface';
import { CreatePatientDto } from '../presentation/dtos/create-patient.dto';

@Injectable()
export class CreatePatientService {
  constructor(
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
  ) {}

  async execute(data: CreatePatientDto): Promise<Paciente> {
    const patientExists = await this.patientsRepository.findByCpf(data.cpf);

    if (patientExists) {
      throw new BadRequestException({
        error: 'Um Paciente com esse CPF já está cadastrado no HealthHub',
      });
    }

    return this.patientsRepository.createAndSave({
      ...data,
      medicamentos_em_uso: data.medicamentos_em_uso ?? '',
    });
  }
}
