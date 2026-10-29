import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import type { ChatMessage, PatientContext } from '../application/clinical-chat.service';
import type { AiChatReply, IAiChatProvider } from '../domain/ai-chat-provider.interface';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';
const MAX_TOKENS = 1024;

function buildSystemPrompt(ctx: PatientContext = {}): string {
  return `Você é o Assistente Clínico HealthHub — apoio técnico para médicos e enfermeiros, nunca substituto.

## PACIENTE
- **Nome:** ${ctx.nome}
- **Alergias:** ${ctx.alergias || 'Nenhuma registrada'}
- **Medicamentos em uso:** ${ctx.medicamentos || 'Nenhum'}
- **Sinais Vitais:** Temp ${ctx.sinaisVitais?.temperatura || '--'}°C | SpO2 ${ctx.sinaisVitais?.saturacao_oxigenio || '--'}% | PA ${ctx.sinaisVitais?.pressao_arterial || '--'} | FC ${ctx.sinaisVitais?.frequencia_cardiaca || '--'} bpm
- **Anamnese:** ${ctx.anamnese || 'Não registrada'}

## REGRAS
1. Responda em Markdown estruturado, técnico e objetivo — o interlocutor é um profissional de saúde.
2. **⚠️ ALERTA DE ALERGIA:** Se qualquer conduta citada oferecer risco dado as alergias do paciente, destaque em negrito.
3. Para comparações clínicas use tabela Markdown com vantagens, desvantagens, indicações e contraindicações.
4. Nunca recuse uma questão clínica — ofereça sempre sua melhor análise. A decisão final é do médico.
5. Ao citar medicamentos, inclua posologia padrão e ajustes para insuficiência renal/hepática quando pertinente.
6. Sempre que possível forneça referências a diretrizes de prática e sugira o CID provável.
7. Máximo 4 parágrafos ou uma tabela + 2 parágrafos. Sem rodeios.`;
}

@Injectable()
export class GroqChatProvider implements IAiChatProvider {
  async execute(message: string, patientContext: PatientContext, history: ChatMessage[] = []): Promise<AiChatReply> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException({ error: 'GROQ_API_KEY não configurada no .env.' });
    }

    const messages = [
      { role: 'system', content: buildSystemPrompt(patientContext) },
      ...(history || [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    try {
      const response = await axios.post(
        GROQ_URL,
        { model: MODEL, max_tokens: MAX_TOKENS, messages },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000,
        },
      );

      const reply = response.data.choices?.[0]?.message?.content ?? '';
      return { reply, source: 'groq' };
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data ?? err.message;
      console.error('[HealthHub Chat] Groq erro:', status, JSON.stringify(detail));
      throw new InternalServerErrorException({ error: 'Assistente clínico indisponível.', detail });
    }
  }
}
