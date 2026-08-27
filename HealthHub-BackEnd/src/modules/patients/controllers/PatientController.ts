import { Request, Response } from "express";
import { CreatePatientService } from "../services/CreatePatientService.js";
import { ListPatientService } from "../services/ListPatientService.js";
import { ShowPatientService } from "../services/ShowPatientService.js";
import { UpdatePatientService } from "../services/UpdatePatientService.js";

export class PatientController {
    
    
    async handle(request: Request, response: Response): Promise<Response> {
        const {
            nome_completo, cpf, rg, idade, sexo, telefone, endereco, alergias,
            medicamentos_em_uso, anamnese 
        } = request.body;

        const createPatientService = new CreatePatientService();
        
        try {
            const patient = await createPatientService.execute({
                nome_completo, cpf, rg, idade, sexo, telefone, endereco, alergias,
                medicamentos_em_uso, anamnese
            });
            return response.status(201).json(patient);

        } catch (err: any) {
            return response.status(400).json({
                error: err.message || "Erro inesperado ao cadastrar paciente."
            });
        }
    }

    // MÉTODO: LISTAR TODOS (GET)
    async index(request: Request, response: Response): Promise<Response> {
        const listPatients = new ListPatientService();
        const patients = await listPatients.execute();
        
        return response.json(patients);
    }

    // MÉTODO: MOSTRAR DETALHES + SINAIS VITAIS (GET)
    async show(request: Request, response: Response): Promise<Response> {
        const id  = request.params.id as string;
        
        if (!id) {
            return response.status(400).json({ error: "ID do paciente é obrigatório." });
        }

        try {
            const showPatient = new ShowPatientService();
            const patient = await showPatient.execute(id);
            return response.json(patient);
        } catch (err: any) {
            return response.status(404).json({ error: err.message });
        }
    }

    // MÉTODO: ATUALIZAR DADOS (PUT)
    async update(request: Request, response: Response): Promise<Response> {
        const { id } = request.params;
        const data = request.body;

        const updateService = new UpdatePatientService();

        try {
            const patient = await updateService.execute({
                id,
                ...data
            });
            return response.json(patient);
        } catch (err: any) {
            return response.status(400).json({ error: err.message });
        }
    }
}