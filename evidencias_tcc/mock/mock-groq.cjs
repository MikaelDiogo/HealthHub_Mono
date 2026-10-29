// PROVEDOR SIMULADO — não chama a Groq. Carregar com: node -r ./mock-groq.cjs dist/main
// Substitui o adaptador HTTP do axios SÓ para api.groq.com, sem alterar o código do projeto.
// Registra cada requisição "enviada" em MOCK_LOG (jsonl) para medir o que sairia da máquina.
// Cenários por texto da mensagem: __ERRO_429__, __ERRO_500__, __TIMEOUT__, __VAZIO__ (demais: resposta simulada).
const fs = require('fs');
const path = require('path');
const axios = require(path.join(process.cwd(), 'node_modules', 'axios'));
const LOG = process.env.MOCK_LOG;

function registrar(obj) { if (LOG) fs.appendFileSync(LOG, JSON.stringify(obj) + '\n'); }

axios.defaults.adapter = async (config) => {
  const url = String(config.url || '');
  if (!url.startsWith('https://api.groq.com/')) throw new Error('MOCK: chamada fora da Groq bloqueada: ' + url);

  const headers = config.headers && typeof config.headers.toJSON === 'function' ? config.headers.toJSON() : { ...(config.headers || {}) };
  const auth = String(headers.Authorization || headers.authorization || '');
  const base = { quando: new Date().toISOString(), url, timeout: config.timeout, tem_authorization: auth.startsWith('Bearer '), authorization_e_chave_simulada: auth.includes('CHAVE-SIMULADA') };

  if (url.endsWith('/chat/completions')) {
    const corpo = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const msgs = corpo.messages || [];
    const ultima = String(msgs[msgs.length - 1]?.content ?? '');
    const resumo = {
      ...base, tipo: 'chat', modelo: corpo.model, max_tokens: corpo.max_tokens, n_mensagens: msgs.length,
      papeis: msgs.map((m) => m.role), chars_sistema: String(msgs[0]?.content ?? '').length, chars_total: msgs.reduce((a, m) => a + String(m.content ?? '').length, 0),
      bytes_corpo: Buffer.byteLength(JSON.stringify(corpo)), sistema: msgs[0]?.content, ultima_mensagem: ultima,
    };
    registrar(resumo);
    const falha = (status, data) => { const e = new Error('Request failed with status code ' + status); e.response = { status, data }; e.isAxiosError = true; return e; };
    if (ultima.includes('__TIMEOUT__')) { const e = new Error('timeout of 30000ms exceeded'); e.code = 'ECONNABORTED'; throw e; }
    if (ultima.includes('__ERRO_429__')) throw falha(429, { error: { message: 'SIMULADO: limite de requisições (rate limit) atingido', type: 'tokens' } });
    if (ultima.includes('__ERRO_500__')) throw falha(500, { error: { message: 'SIMULADO: erro interno do provedor' } });
    const data = ultima.includes('__VAZIO__') ? { choices: [] } : { choices: [{ message: { content: '[RESPOSTA SIMULADA — NÃO É DO MODELO REAL] Texto fixo do mock para teste de integração.' } }] };
    return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
  }

  if (url.endsWith('/audio/transcriptions')) {
    // O corpo é um FormData (stream); lemos para medir tamanho e campos de texto
    const chunks = [];
    await new Promise((res, rej) => { config.data.on('data', (c) => chunks.push(Buffer.from(c))); config.data.on('end', res); config.data.on('error', rej); config.data.resume && config.data.resume(); });
    const bruto = Buffer.concat(chunks); const texto = bruto.toString('latin1');
    const campo = (n) => (texto.match(new RegExp('name="' + n + '"\\r\\n\\r\\n([^\\r]*)')) || [])[1];
    const nomeArq = (texto.match(/name="file"; filename="([^"]*)"/) || [])[1];
    const tipoArq = (texto.match(/Content-Type: ([^\r]*)/) || [])[1];
    registrar({ ...base, tipo: 'audio', modelo: campo('model'), language: campo('language'), response_format: campo('response_format'), arquivo: nomeArq, content_type_arquivo: tipoArq, bytes_corpo_multipart: bruto.length });
    if (nomeArq && nomeArq.includes('erro')) { const e = new Error('Request failed with status code 400'); e.response = { status: 400, data: { error: { message: 'SIMULADO: áudio ilegível' } } }; e.isAxiosError = true; throw e; }
    return { data: { text: '[TRANSCRIÇÃO SIMULADA — NÃO É DO MODELO REAL] paciente refere dor de cabeça' }, status: 200, statusText: 'OK', headers: {}, config, request: {} };
  }
  throw new Error('MOCK: rota não prevista ' + url);
};
console.log('[MOCK-GROQ] adaptador simulado ativo (nenhuma chamada real será feita)');
