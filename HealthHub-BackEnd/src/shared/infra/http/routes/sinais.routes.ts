import { Router } from "express";
import { SinaisVitaisController } from "../../../../modules/patients/controllers/SinaisVitaisController.js";
import { checkRole } from "../../../../shared/infra/http/middlewares/auth.js";

const sinaisRouter = Router();
const sinaisController = new SinaisVitaisController();

sinaisRouter.post("/:id", checkRole('medico', 'enfermeiro'), sinaisController.handle);
sinaisRouter.get('/:patientId/vitals', checkRole('medico', 'enfermeiro'), sinaisController.show);

export { sinaisRouter };
