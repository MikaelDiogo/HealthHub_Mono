import { Request, Response } from "express";
import { CreateFilaService } from "../services/CreateFilaService.js";
import { ListFilaService } from "../services/ListFilaService.js";
import { UpdateFilaService } from "../services/UpdateFilaService.js";
import { DeleteFilaService } from "../services/DeleteFilaService.js";

export class FilaController {
    async index(_req: Request, res: Response): Promise<Response> {
        const service = new ListFilaService();
        const fila = await service.execute();
        return res.json(fila);
    }

    async create(req: Request, res: Response): Promise<Response> {
        const { paciente_id, nome, idade, senha, chegada, status } = req.body;

        try {
            const service = new CreateFilaService();
            const entrada = await service.execute({ paciente_id, nome, idade, senha, chegada, status });
            return res.status(201).json(entrada);
        } catch (err: any) {
            return res.status(400).json({ error: err.message });
        }
    }

    async update(req: Request, res: Response): Promise<Response> {
        const id = req.params.id as string;
        const { status, gravidade } = req.body;

        try {
            const service = new UpdateFilaService();
            const entrada = await service.execute({ id, status, gravidade });
            return res.json(entrada);
        } catch (err: any) {
            return res.status(404).json({ error: err.message });
        }
    }

    async delete(req: Request, res: Response): Promise<Response> {
        const id = req.params.id as string;

        try {
            const service = new DeleteFilaService();
            await service.execute(id);
            return res.status(204).send();
        } catch (err: any) {
            return res.status(404).json({ error: err.message });
        }
    }
}
