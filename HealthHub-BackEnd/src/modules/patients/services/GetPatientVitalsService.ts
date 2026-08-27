import { AppDataSource } from '../../../database/data-source.js';
import { Paciente } from '../entities/Pacientes.js';
import { SinaisVitais } from '../entities/SinaisVitais.js';

interface Request {
  patient_id: string;
}

export default class GetPatientVitalsService {
  public async execute({ patient_id }: Request): Promise<SinaisVitais[]> {
    const vitalsRepository = AppDataSource.getRepository(SinaisVitais);
    const patientsRepository = AppDataSource.getRepository(Paciente);

    const patientExists = await patientsRepository.findOneBy({ id: patient_id });

    if (!patientExists) {
      throw new Error('Paciente não encontrado.');
    }

    return vitalsRepository.find({
      where: { patient_id },
      order: { created_at: 'DESC' },
      take: 12,
    });
  }
}
