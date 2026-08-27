import { Request, Response } from 'express';
import { CreateSinaisVitaisService } from '../services/CreateSinaisVitaisService.js';
import { GetPatientVitalsHistoryService } from '../services/GetPatientVitalsHistoryService.js';

export class SinaisVitaisController {
  async show(req: Request, res: Response) {
    const { patientId } = req.params as { patientId: string };

    if (!patientId) {
      return res.status(400).json({ error: 'ID do paciente não fornecido.' });
    }

    try {
      const service = new GetPatientVitalsHistoryService();
      const dados = await service.execute({ patient_id: patientId });
      return res.json(dados);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno ao buscar sinais vitais.';
      return res.status(500).json({ error: message });
    }
  }

  async handle(request: Request, response: Response): Promise<Response> {
    const patient_id = request.params.id || request.body.patient_id;
    const { frequencia_cardiaca, saturacao_oxigenio, pressao_arterial, temperatura, hora } = request.body;

    if (!patient_id) {
      return response.status(400).json({ error: 'O ID do paciente é obrigatório.' });
    }

    const agora = new Date();
    const horaFormatada = hora
      ? Number(hora)
      : Number(`${agora.getHours()}${agora.getMinutes().toString().padStart(2, '0')}`);

    const createSinais = new CreateSinaisVitaisService();

    try {
      const sinais = await createSinais.execute({
        patient_id,
        hora: horaFormatada,
        frequencia_cardiaca,
        saturacao_oxigenio,
        pressao_arterial,
        temperatura,
      });

      return response.status(201).json(sinais);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar sinais vitais.';
      return response.status(400).json({ error: message });
    }
  }
}
