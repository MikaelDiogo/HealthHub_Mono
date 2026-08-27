import { AppDataSource } from "../../../database/data-source.js";
import { FilaPaciente } from "../entities/FilaPaciente.js";

interface ICreateFilaRequest {
    paciente_id: string;
    nome: string;
    idade: number;
    senha: string;
    chegada: string;
    status: string;
}

export class CreateFilaService {
    async execute(data: ICreateFilaRequest): Promise<FilaPaciente> {
        const repo = AppDataSource.getRepository(FilaPaciente);

        const jaExiste = await repo.findOneBy({ paciente_id: data.paciente_id });
        if (jaExiste) {
            throw new Error("Paciente já está na fila de atendimento.");
        }

        const entrada = repo.create(data);
        await repo.save(entrada);
        return entrada;
    }
}
