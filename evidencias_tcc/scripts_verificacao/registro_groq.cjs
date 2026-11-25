// REGISTRADOR (não simula nada): anota o que a Groq responde nas chamadas de chat, SEM alterar o pedido nem a resposta e SEM registrar a chave.
// Carregar na API com: node -r <este arquivo> dist/main   (GROQ_REGISTRO=<arquivo .jsonl> define onde anotar). Só roda a partir da pasta HealthHub-BackEnd.
// Anota por chamada: quando, status HTTP, finish_reason, tokens, modelo, max_tokens enviado, tamanho do texto, o texto (dados fictícios) e as mensagens
// enviadas (papel e conteúdo; o cabeçalho Authorization nunca é lido).
const fs = require('fs');
const path = require('path');
const axios = require(path.join(process.cwd(), 'node_modules', 'axios'));
const ARQ = process.env.GROQ_REGISTRO;
const anotar = (o) => { if (ARQ) fs.appendFileSync(ARQ, JSON.stringify(o) + '\n'); };
const original = axios.post.bind(axios);

axios.post = async function (url, data, cfg) {
  const eChat = String(url).endsWith('/chat/completions');
  const t0 = Date.now();
  try {
    const r = await original(url, data, cfg);
    if (eChat) {
      const ch = r.data?.choices?.[0];
      anotar({
        quando: new Date().toISOString(), http: r.status, ms: Date.now() - t0, modelo: data?.model, max_tokens_enviado: data?.max_tokens,
        campos_do_corpo: Object.keys(data || {}), finish_reason: ch?.finish_reason ?? null, completion_tokens: r.data?.usage?.completion_tokens ?? null,
        reasoning_tokens: r.data?.usage?.completion_tokens_details?.reasoning_tokens ?? null, chars_content: (ch?.message?.content ?? '').length,
        content: ch?.message?.content ?? '', mensagens_enviadas: (data?.messages || []).map((m) => ({ role: m.role, content: m.content })),
      });
    }
    return r;
  } catch (e) {
    if (eChat) anotar({ quando: new Date().toISOString(), http: e.response?.status ?? null, ms: Date.now() - t0, erro: true, retry_after: e.response?.headers?.['retry-after'] ?? null });
    throw e;
  }
};
console.log('[REGISTRO-GROQ] anotando status e finish_reason (a chave não é lida nem gravada)');
