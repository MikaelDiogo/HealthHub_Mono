import { Request, Response } from 'express';
import GetPatientVitalsService from '../services/GetPatientVitalsService.js';

class GetPatientVitalsController {
  public async show(request: Request, response: Response): Promise<Response> {
    try {
      // Forçamos o TypeScript a entender que 'id' é uma string
      const { id } = request.params as { id: string };

      // Se por algum motivo bizarro o id não vier, lançamos erro antes do Service
      if (!id) {
        throw new Error('ID do paciente é obrigatório.');
      }

      const getVitals = new GetPatientVitalsService();
      const vitals = await getVitals.execute({ patient_id: id });

      return response.json(vitals);
    } catch (err: any) {
      return response.status(400).json({ error: err.message });
    }
  }
}

export default GetPatientVitalsController;