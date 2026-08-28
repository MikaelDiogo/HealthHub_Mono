import { Request, Response } from "express";
import axios from "axios";

// Endpoint e modelo via OAuth token do Claude Code
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1024;

function buildSystemPrompt(ctx: any): string {
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

export class PatientChatController {
  public async handle(req: Request, res: Response): Promise<Response> {
    const { message, patientContext, history } = req.body;

    const token = process.env.CLAUDE_OAUTH_TOKEN;
    if (!token) {
      return res.status(503).json({ error: 'Assistente clínico não configurado. Adicione CLAUDE_OAUTH_TOKEN no .env.' });
    }

    const messages = [
      ...((history as { role: string; content: string }[]) || [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    try {
      const response = await axios.post(
        CLAUDE_API_URL,
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: buildSystemPrompt(patientContext),
          messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'claude-code/1.0.0',
            'anthropic-version': '2023-06-01',
            'Accept': 'application/json',
          },
          timeout: 30000,
        },
      );

      const textBlock = response.data.content?.find((b: any) => b.type === 'text');
      const reply = textBlock?.text ?? '';

      return res.json({ reply, source: 'claude-sonnet-oauth' });
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data ?? err.message;
      console.error('[HealthHub Chat] Erro:', status, JSON.stringify(detail));
      return res.status(500).json({ error: 'Assistente clínico indisponível.', status, detail });
    }
  }
}
