import { Router } from "express";
import { sinaisRouter } from "./sinais.routes.js";
import { patientsRouter } from "./patients.routes.js";
import { filaRouter } from "./fila.routes.js";
import { authMiddleware } from "../middlewares/auth.js";

const routes = Router();

routes.use(authMiddleware);

routes.use("/patients", patientsRouter);
routes.use("/sinais", sinaisRouter);
routes.use("/fila", filaRouter);

export { routes };