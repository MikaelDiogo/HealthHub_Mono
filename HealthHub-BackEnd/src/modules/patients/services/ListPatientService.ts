import { AppDataSource } from "../../../database/data-source.js";
import { Paciente } from "../entities/Pacientes.js";

class ListPatientService {
    public async execute(): Promise<Paciente[]> {
        const patientRepository = AppDataSource.getRepository(Paciente);

        const patients = await patientRepository.find({
            relations: ["sinaisVitais"],
            order: {
                sinaisVitais: {
                    created_at: 'DESC'
                }
            },
        });

        return patients;

    }
}

export { ListPatientService };
