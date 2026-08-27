import { AppDataSource } from "../../../database/data-source.js";
import { FilaPaciente } from "../entities/FilaPaciente.js";

export class ListFilaService {
    async execute(): Promise<FilaPaciente[]> {
        const repo = AppDataSource.getRepository(FilaPaciente);
        return repo.find({ order: { created_at: "ASC" } });
    }
}
