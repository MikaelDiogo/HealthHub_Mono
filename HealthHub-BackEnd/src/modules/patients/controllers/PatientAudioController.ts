import { Request, Response } from "express";
import axios from "axios";
import FormData from "form-data";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export class PatientAudioController {
  public async handle(req: Request, res: Response): Promise<Response> {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
    }

    if (!GROQ_API_KEY) {
      return res.status(503).json({
        error: 'Transcrição não configurada. Adicione GROQ_API_KEY no arquivo .env.',
      });
    }

    try {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'audio.webm',
        contentType: req.file.mimetype || 'audio/webm',
      });
      form.append('model', 'whisper-large-v3-turbo');
      form.append('language', 'pt');
      form.append('response_format', 'json');

      const response = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        form,
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            ...form.getHeaders(),
          },
          timeout: 30000,
        }
      );

      return res.json({ transcription: response.data.text });
    } catch (err: any) {
      console.error('[HealthHub] Falha na transcrição de áudio:', err.message);
      return res.status(500).json({ error: 'Falha ao transcrever o áudio.' });
    }
  }
}
