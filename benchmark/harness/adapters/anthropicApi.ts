import axios from 'axios';
import type { ModelAdapter, ResultadoClassificacao, Vinheta } from '../types';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompt';
import { parseClassificacao } from '../validate';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

// Custo (API Console): US$ 2,00 / milhão de tokens de entrada, US$ 10,00 / milhão de saída.
export const CUSTO_USD_POR_TOKEN_IN = 2 / 1_000_000;
export const CUSTO_USD_POR_TOKEN_OUT = 10 / 1_000_000;

export const anthropicApiAdapter: ModelAdapter = {
  nome: 'claude-sonnet-5-via-api',

  disponivel() {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  async classificar(vinheta: Vinheta): Promise<ResultadoClassificacao> {
    const inicio = Date.now();
    try {
      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 512,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserPrompt(vinheta) }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          timeout: 30_000,
        },
      );

      const tempo_ms = Date.now() - inicio;
      const texto = response.data.content?.[0]?.text ?? '';
      const classificacao = parseClassificacao(texto) ?? undefined;

      return {
        classificacao,
        tempo_ms,
        tokens_in: response.data.usage?.input_tokens,
        tokens_out: response.data.usage?.output_tokens,
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
