import { FilaPaciente } from './fila-paciente.entity';

export const FILA_REPOSITORY = 'FILA_REPOSITORY';

export interface IFilaRepository {
  findAll(): Promise<FilaPaciente[]>;
  findById(id: string): Promise<FilaPaciente | null>;
  findByPacienteId(pacienteId: string): Promise<FilaPaciente | null>;
  createAndSave(data: Partial<FilaPaciente>): Promise<FilaPaciente>;
  save(entrada: FilaPaciente): Promise<FilaPaciente>;
  remove(entrada: FilaPaciente): Promise<void>;
}
