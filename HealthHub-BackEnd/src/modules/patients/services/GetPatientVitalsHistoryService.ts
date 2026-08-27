import { AppDataSource } from '../../../database/data-source.js';
import { SinaisVitais } from '../entities/SinaisVitais.js';

interface Request {
  patient_id: string;
}

export class GetPatientVitalsHistoryService {
  public async execute({ patient_id }: Request): Promise<SinaisVitais[]> {
    const vitalsRepository = AppDataSource.getRepository(SinaisVitais);

    return vitalsRepository.find({
      where: { patient_id },
      order: { created_at: 'DESC' },
    });
  }
}
