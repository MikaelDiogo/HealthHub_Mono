import { AppDataSource } from "../../../database/data-source.js";
import { FilaPaciente } from "../entities/FilaPaciente.js";

interface IUpdateFilaRequest {
    id: string;
    status: string;
    gravidade?: string;
}

export class UpdateFilaService {
    async execute({ id, status, gravidade }: IUpdateFilaRequest): Promise<FilaPaciente> {
        const repo = AppDataSource.getRepository(FilaPaciente);

        const entrada = await repo.findOneBy({ id });
        if (!entrada) {
            throw new Error("Entrada na fila não encontrada.");
        }

        entrada.status = status;
        if (gravidade !== undefined) entrada.gravidade = gravidade;

        await repo.save(entrada);
        return entrada;
    }
}
