import { Router } from "express";
import { FilaController } from "../../../../modules/patients/controllers/FilaController.js";
import { checkRole } from "../middlewares/auth.js";

const filaRouter = Router();
const filaController = new FilaController();

// Leitura da fila: médico e enfermeiro
filaRouter.get("/", checkRole('medico', 'enfermeiro', 'recepcionista'), (req, res) => filaController.index(req, res));

// Criação na fila: recepcionista, enfermeiro e médico
filaRouter.post("/", checkRole('medico', 'enfermeiro', 'recepcionista'), (req, res) => filaController.create(req, res));

// Atualização de status: apenas médico e enfermeiro
filaRouter.put("/:id", checkRole('medico', 'enfermeiro'), (req, res) => filaController.update(req, res));

// Remoção da fila: apenas médico
filaRouter.delete("/:id", checkRole('medico'), (req, res) => filaController.delete(req, res));

export { filaRouter };
