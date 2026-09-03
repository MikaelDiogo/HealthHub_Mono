import { Visita } from './visita.entity';

export const VISITAS_REPOSITORY = 'VISITAS_REPOSITORY';

export interface IVisitasRepository {
  create(data: Partial<Visita>): Promise<Visita>;
  save(visita: Visita): Promise<Visita>;
  findById(id: string): Promise<Visita | null>;
  findActiveByPacienteId(pacienteId: string): Promise<Visita | null>;
  findAllByPacienteId(pacienteId: string): Promise<Visita[]>;
  countByPacienteId(pacienteId: string): Promise<number>;
}
