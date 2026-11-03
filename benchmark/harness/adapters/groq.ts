import axios from 'axios';
import type { ModelAdapter, ResultadoClassificacao, Vinheta } from '../types';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompt';
import { parseClassificacao } from '../validate';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Mesmo modelo já configurado em HealthHub-BackEnd/src/modules/ai/application/clinical-chat.service.ts
const MODEL = 'openai/gpt-oss-120b';

export const groqAdapter: ModelAdapter = {
  nome: 'groq',

  disponivel() {
    return !!process.env.GROQ_API_KEY;
  },

  async classificar(vinheta: Vinheta): Promise<ResultadoClassificacao> {
    const inicio = Date.now();
    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model: MODEL,
          temperature: 0,
          max_tokens: 512,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(vinheta) },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          timeout: 30_000,
        },
      );

      const tempo_ms = Date.now() - inicio;
      const texto = response.data.choices?.[0]?.message?.content ?? '';
      const classificacao = parseClassificacao(texto) ?? undefined;

      return {
        classificacao,
        tempo_ms,
        tokens_in: response.data.usage?.prompt_tokens,
        tokens_out: response.data.usage?.completion_tokens,
        formato_ok: !!classificacao,
        erro: classificacao ? undefined : `Formato inválido: ${texto.slice(0, 200)}`,
        tipo_erro: classificacao ? undefined : 'formato',
      };
    } catch (err: any) {
      return {
        tempo_ms: Date.now() - inicio,
        formato_ok: false,
        erro: err.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : String(err.message ?? err),
        tipo_erro: 'infra',
      };
    }
  },
};
