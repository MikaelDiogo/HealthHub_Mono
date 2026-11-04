import { Paciente } from './paciente.entity';

export const PATIENTS_REPOSITORY = 'PATIENTS_REPOSITORY';

export interface IPatientsRepository {
  findByCpf(cpf: string): Promise<Paciente | null>;
  findById(id: string): Promise<Paciente | null>;
  findByIdWithVitals(id: string): Promise<Paciente | null>;
  findAllWithVitals(ativo?: boolean): Promise<Paciente[]>;
  createAndSave(data: Partial<Paciente>): Promise<Paciente>;
  save(paciente: Paciente): Promise<Paciente>;
  /**
   * Grava o cadastro e, na MESMA transação, atualiza a cópia de nome e idade guardada nas entradas ativas da esteira
   * (fila_pacientes). Devolve quantas entradas da esteira foram atualizadas (para avisar os clientes em tempo real).
   */
  saveSincronizandoFila(paciente: Paciente): Promise<{ paciente: Paciente; filaAtualizada: number }>;
  setAtivo(id: string, ativo: boolean): Promise<void>;
}
