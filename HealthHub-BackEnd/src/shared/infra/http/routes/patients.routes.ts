import { Router } from "express";
import multer from "multer";
import { PatientController } from "../../../../modules/patients/controllers/PatientController.js";
import GetPatientVitalsController from "../../../../modules/patients/controllers/GetPatientsVitalsController.js";
import { PatientChatController } from "../../../../modules/patients/controllers/PatientChatController.js";
import { PatientAudioController } from "../../../../modules/patients/controllers/PatientAudioController.js";
import { checkRole } from "../../../../shared/infra/http/middlewares/auth.js";
import { validate, validateUUID } from "../../../../shared/infra/http/middlewares/validate.js";
import { CreatePatientSchema, UpdatePatientSchema } from "../../../../shared/infra/http/middlewares/schemas.js";

const patientsRouter = Router();
const patientController = new PatientController();
const vitalsController = new GetPatientVitalsController();
const chatController = new PatientChatController();
const audioController = new PatientAudioController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio são aceitos.'));
    }
  },
});

// Listagem restrita a profissionais de saúde autenticados
patientsRouter.get("/", checkRole('medico', 'enfermeiro', 'recepcionista'), patientController.index);
patientsRouter.post("/", checkRole('medico', 'enfermeiro', 'recepcionista'), validate(CreatePatientSchema), patientController.handle);

// Apenas médico e enfermeiro acessam dados clínicos detalhados
patientsRouter.get("/:id", checkRole('medico', 'enfermeiro'), validateUUID('id'), patientController.show);
patientsRouter.put("/:id", checkRole('medico', 'enfermeiro'), validateUUID('id'), validate(UpdatePatientSchema), patientController.update);
patientsRouter.get("/:id/vitals", checkRole('medico', 'enfermeiro'), validateUUID('id'), vitalsController.show);

patientsRouter.post("/:id/chat", checkRole('medico', 'enfermeiro'), validateUUID('id'), (req, res) => chatController.handle(req, res));
patientsRouter.post("/:id/chat/audio", checkRole('medico', 'enfermeiro'), validateUUID('id'), upload.single('audio'), (req, res) => audioController.handle(req, res));

export { patientsRouter };
