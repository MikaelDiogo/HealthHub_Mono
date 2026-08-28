import { Paciente } from './paciente.entity';

export const PATIENTS_REPOSITORY = 'PATIENTS_REPOSITORY';

export interface IPatientsRepository {
  findByCpf(cpf: string): Promise<Paciente | null>;
  findById(id: string): Promise<Paciente | null>;
  findByIdWithVitals(id: string): Promise<Paciente | null>;
  findAllWithVitals(): Promise<Paciente[]>;
  createAndSave(data: Partial<Paciente>): Promise<Paciente>;
  save(paciente: Paciente): Promise<Paciente>;
}
