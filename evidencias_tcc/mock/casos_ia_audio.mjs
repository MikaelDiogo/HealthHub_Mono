// Casos de IA e áudio contra o backend REAL, com o provedor SIMULADO (mock-groq.cjs).
// Uso: MODO=com_chave|sem_chave SAIDA=arquivo.json node casos_ia_audio.mjs   (variáveis SEED_* do banco de teste no ambiente)
import fs from 'node:fs';
const MODO = process.env.MODO || 'com_chave';
const API = 'http://localhost:3001';
const SAIDA = process.env.SAIDA;
const ID = '11111111-1111-4111-8111-111111111111'; // o :id da URL não é usado pelo backend

const login = async (email, password) => { const r = await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); return (await r.json()).token; };
const tokMed = await login(process.env.SEED_MEDICO_EMAIL, process.env.SEED_MEDICO_SENHA);
const tokRec = await login(process.env.SEED_RECEPCIONISTA_EMAIL, process.env.SEED_RECEPCIONISTA_SENHA);

const ctx = { nome: 'TESTE A — Silva', alergias: 'Nenhuma (fictício)', medicamentos: 'Nenhum (fictício)', anamnese: 'Dor lombar após esforço (fictício).', sinaisVitais: { temperatura: 36.5, saturacao_oxigenio: 98, pressao_arterial: '120/80', frequencia_cardiaca: 72 } };
const hist = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `mensagem ${i + 1} do histórico (fictícia)` }));
const resultados = [];

async function chat(id, descricao, corpo, token = tokMed) {
  const r = await fetch(`${API}/patients/${ID}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
  const txt = await r.text(); let corpoResp; try { corpoResp = JSON.parse(txt); } catch { corpoResp = txt.slice(0, 200); }
  resultados.push({ id, descricao, status: r.status, resposta: corpoResp });
}
async function audio(id, descricao, { bytes = 2048, tipo = 'audio/webm', nome = 'ditado.webm', semArquivo = false, token = tokMed }) {
  const fd = new FormData();
  if (!semArquivo) fd.append('audio', new Blob([new Uint8Array(bytes)], { type: tipo }), nome);
  let status, corpoResp;
  try { const r = await fetch(`${API}/patients/${ID}/chat/audio`, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd }); status = r.status; const t = await r.text(); try { corpoResp = JSON.parse(t); } catch { corpoResp = t.slice(0, 200); } }
  catch (e) { status = 'sem resposta'; corpoResp = String(e.cause?.code || e.message); }
  resultados.push({ id, descricao, status, resposta: corpoResp });
}

if (MODO === 'com_chave') {
  await chat('I01-a', 'Chat válido: contexto completo + 4 mensagens de histórico', { message: 'Resuma os sinais registrados.', patientContext: ctx, history: hist(4) });
  await chat('I01-b', 'Chat com campos EXTRAS no contexto (cpf, rg, telefone, endereço): vão para a Groq?', { message: 'Olá', patientContext: { ...ctx, cpf: '99999999901', rg: '12.345.678-9', telefone: '11900000000', endereco: 'Rua Fictícia, 1' }, history: [] });
  await chat('I01-c', 'Histórico com 12 mensagens (o backend limita?)', { message: 'Continue.', patientContext: ctx, history: hist(12) });
  await chat('I01-d', 'Provedor responde 429 (simulado)', { message: '__ERRO_429__', patientContext: ctx });
  await chat('I01-e', 'Provedor responde 500 (simulado)', { message: '__ERRO_500__', patientContext: ctx });
  await chat('I01-f', 'Timeout do provedor (simulado)', { message: '__TIMEOUT__', patientContext: ctx });
  await chat('I01-g', 'Provedor devolve lista de escolhas vazia', { message: '__VAZIO__', patientContext: ctx });
  await chat('I01-h', 'Corpo maior que 10 kb (anamnese de 11000 caracteres)', { message: 'Olá', patientContext: { ...ctx, anamnese: 'x'.repeat(11000) } });
  await chat('I01-i', 'Sem token', { message: 'Olá', patientContext: ctx }, null);
  await chat('I01-j', 'Perfil recepcionista', { message: 'Olá', patientContext: ctx }, tokRec);
  await chat('I01-k', 'patientContext nulo', { message: 'Olá', patientContext: null });
  await chat('I01-l', 'Sem o campo message', { patientContext: ctx });
  await chat('I01-m', 'JSON inválido', '{"message": "Olá", ');
  await audio('I02-a', 'ÁUDIO VÁLIDO (audio/webm, 2 KB)', {});
  await audio('I03-a', 'Áudio INVÁLIDO: arquivo de texto (text/plain)', { tipo: 'text/plain', nome: 'nota.txt' });
  await audio('I03-b', 'Áudio AUSENTE: requisição sem arquivo', { semArquivo: true });
  await audio('I03-c', 'Áudio acima do limite (26 MB)', { bytes: 26 * 1024 * 1024 });
  await audio('I03-d', 'Áudio vazio (0 byte, audio/webm)', { bytes: 0 });
  await audio('I03-e', 'Provedor recusa o áudio (simulado, nome contém "erro")', { nome: 'ditado-erro.webm' });
  await audio('I03-f', 'Perfil recepcionista', { token: tokRec });
} else {
  await chat('I01-sem-chave', 'Chat SEM GROQ_API_KEY no backend', { message: 'Olá', patientContext: ctx });
  await audio('I02-sem-chave', 'Áudio válido SEM GROQ_API_KEY no backend', {});
}
fs.writeFileSync(SAIDA, JSON.stringify(resultados, null, 2));
for (const r of resultados) console.log(`${r.id.padEnd(14)} HTTP ${String(r.status).padEnd(12)} ${r.descricao}`);
