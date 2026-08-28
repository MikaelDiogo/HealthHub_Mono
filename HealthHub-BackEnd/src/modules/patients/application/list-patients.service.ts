import { Inject, Injectable } from '@nestjs/common';
import { Paciente } from '../domain/paciente.entity';
import { IPatientsRepository, PATIENTS_REPOSITORY } from '../domain/patients-repository.interface';

@Injectable()
export class ListPatientsService {
  constructor(
    @Inject(PATIENTS_REPOSITORY)
    private readonly patientsRepository: IPatientsRepository,
  ) {}

  execute(): Promise<Paciente[]> {
    return this.patientsRepository.findAllWithVitals();
  }
}
