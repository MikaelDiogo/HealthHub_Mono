import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

@Injectable()
export class AudioTranscriptionService {
  async execute(file: Express.Multer.File): Promise<{ transcription: string }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException({
        error: 'Transcrição de áudio não configurada neste ambiente.',
      });
    }

    try {
      const form = new FormData();
      form.append('file', file.buffer, {
        filename: file.originalname || 'audio.webm',
        contentType: file.mimetype || 'audio/webm',
      });
      form.append('model', 'whisper-large-v3-turbo');
      form.append('language', 'pt');
      form.append('response_format', 'json');

      const response = await axios.post(GROQ_TRANSCRIPTION_URL, form, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
        timeout: 30000,
      });

      return { transcription: response.data.text };
    } catch (err: any) {
      console.error('[HealthHub] Falha na transcrição de áudio:', err.message);
      throw new InternalServerErrorException({ error: 'Falha ao transcrever o áudio.' });
    }
  }
}
