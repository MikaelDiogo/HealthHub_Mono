import { AppDataSource } from "../../../database/data-source.js";
import { Paciente } from "../entities/Pacientes.js";

interface IPatientRequest {
    nome_completo: string;
    cpf: string;
    rg?: string;
    idade: number;
    sexo: string;
    telefone?: string;
    endereco?: string;
    alergias?: string;
    medicamentos_em_uso: string;
    anamnese?: string;

}

export class CreatePatientService {
    async execute(data: IPatientRequest): Promise<Paciente> {
        
        const repo = AppDataSource.getRepository(Paciente);
        const patientExists = await repo.findOneBy( { cpf: data.cpf } );

        if(patientExists){
            throw new Error("Um Paciente com esse CPF já está cadastrado no HealthHub");

        }
         const patient = repo.create(data);
         await repo.save(patient);
         return patient;


    }
}