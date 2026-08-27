import { AppDataSource } from "../../../database/data-source.js";
import { FilaPaciente } from "../entities/FilaPaciente.js";

export class DeleteFilaService {
    async execute(id: string): Promise<void> {
        const repo = AppDataSource.getRepository(FilaPaciente);

        const entrada = await repo.findOneBy({ id });
        if (!entrada) {
            throw new Error("Entrada na fila não encontrada.");
        }

        await repo.remove(entrada);
    }
}
