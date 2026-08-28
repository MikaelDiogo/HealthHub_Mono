import { SinaisVitais } from './sinais-vitais.entity';

export const SINAIS_VITAIS_REPOSITORY = 'SINAIS_VITAIS_REPOSITORY';

export interface ISinaisVitaisRepository {
  createAndSave(data: Partial<SinaisVitais>): Promise<SinaisVitais>;
  findAllByPatient(patientId: string): Promise<SinaisVitais[]>;
  findLatestByPatient(patientId: string, limit: number): Promise<SinaisVitais[]>;
}
