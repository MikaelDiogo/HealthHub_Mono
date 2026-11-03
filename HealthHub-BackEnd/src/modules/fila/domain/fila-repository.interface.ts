import { FilaPaciente } from './fila-paciente.entity';

export const FILA_REPOSITORY = 'FILA_REPOSITORY';

export interface IFilaRepository {
  findAll(): Promise<FilaPaciente[]>;
  findById(id: string): Promise<FilaPaciente | null>;
  findByPacienteId(pacienteId: string): Promise<FilaPaciente | null>;
  createAndSave(data: Partial<FilaPaciente>): Promise<FilaPaciente>;
  /**
   * Admissão atômica (uma transação): bloqueia a fila, recusa paciente já presente (409), gera a senha PR-NNN,
   * grava a entrada, abre (ou reaproveita) a visita e reativa o paciente.
   */
  admitirAtomico(data: Partial<FilaPaciente>, motivoVisita?: string): Promise<FilaPaciente>;
  save(entrada: FilaPaciente): Promise<FilaPaciente>;
  remove(entrada: FilaPaciente): Promise<void>;
}
