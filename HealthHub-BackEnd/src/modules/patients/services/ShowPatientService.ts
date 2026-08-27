import { AppDataSource } from "../../../database/data-source.js";
import { Paciente } from "../entities/Pacientes.js";

class ShowPatientService {
    public async execute(id: string): Promise<Paciente | null> {
        const patientsRepository = AppDataSource.getRepository(Paciente);

        const patient = await patientsRepository.findOne({ 
            where: { id },
            relations: ["sinaisVitais"]

         });

        if(!patient){
            throw new Error("Paciente não encontrado no HealthHub.");

        }
        
        return patient;
    }
}

export { ShowPatientService };