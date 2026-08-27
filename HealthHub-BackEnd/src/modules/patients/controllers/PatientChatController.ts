import { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

export class PatientChatController {
  private buildSystemPrompt(ctx: any): string {
    const extras = [
      ctx.diagnosticos && `- **Diagnósticos:** ${ctx.diagnosticos}`,
      ctx.exames      && `- **Exames recentes:** ${ctx.exames}`,
      ctx.historico   && `- **Histórico relevante:** ${ctx.historico}`,
    ].filter(Boolean).join('\n');

    return `Você é o Assistente Clínico HealthHub — apoio técnico para médicos, nunca substituto.

## PACIENTE
- **Nome:** ${ctx.nome}
- **Alergias:** ${ctx.alergias || 'Nenhuma registrada'}
- **Medicamentos em uso:** ${ctx.medicamentos || 'Nenhum'}
- **Sinais Vitais:** Temp ${ctx.sinaisVitais?.temperatura || '--'}°C | SpO2 ${ctx.sinaisVitais?.saturacao_oxigenio || '--'}% | PA ${ctx.sinaisVitais?.pressao || '--'}
${extras}

## REGRAS
1. Responda em Markdown estruturado, sendo técnico e objetivo — o interlocutor é um profissional de saúde.
2. **⚠️ ALERTA DE ALERGIA:** Se qualquer conduta citada oferecer risco dado as alergias do paciente, destaque isso imediatamente em negrito.
3. Para comparações clínicas (ex: IV vs IM, fármaco A vs B), use tabela Markdown com vantagens, desvantagens, indicações e contraindicações.
4. Nunca recuse uma questão clínica — ofereça sempre sua melhor análise. A decisão final é do médico.
5. Ao citar medicamentos, inclua posologia padrão e ajustes para insuficiência renal/hepática quando pertinente.
6. Sempre que possível, forneça referências a evidências clínicas ou diretrizes de prática, e tambem diga o possivel CID do diagnostico.
7. Máximo 4 parágrafos ou uma tabela + 2 parágrafos. Sem rodeios.`;
  }

  public async handle(req: Request, res: Response): Promise<Response> {
    const { message, patientContext, history } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Assistente clínico não configurado. Adicione ANTHROPIC_API_KEY no .env.' });
    }

    // Filtra apenas mensagens user/assistant (remove eventuais system do histórico)
    const chatMessages: Anthropic.MessageParam[] = (history as { role: string; content: string }[])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    chatMessages.push({ role: 'user', content: message });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: this.buildSystemPrompt(patientContext),
        messages: chatMessages,
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      const reply = textBlock?.type === 'text' ? textBlock.text : '';

      return res.json({ reply, source: 'claude-haiku' });
    } catch (err: any) {
      console.error('[HealthHub] Erro ao chamar Claude:', err.message);
      return res.status(500).json({ error: 'Assistente clínico indisponível no momento.' });
    }
  }
}
