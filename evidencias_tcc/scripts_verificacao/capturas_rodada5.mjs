// Rodada 5: Figura 26 refeita (chat de IA com a resposta REAL da Groq, agora com o bloco de conferência de CID) e as 3 chamadas reais do Passo 6.4.
// MESMO paciente fictício, MESMA pergunta, MESMO recorte (1280 x 800, tema claro, topo do chat) da captura original (novo04_chat_ia_cid.png, rodada 2).
// Chamada 1 = a da captura (pela tela); chamadas 2 e 3 = pelo mesmo endpoint, com o mesmo corpo que a tela envia. Espaço mínimo de 14 s entre elas.
// Pare na primeira falha 429: não tenta de novo. A chave da Groq vive SÓ no processo da API (este script não a vê); a API sobe com registro_groq.cjs.
// Uso: source <ambiente de teste>; CDP_LIB=<cdp.mjs> EV_DIR=<pasta> COMMIT=<hash> GROQ_REGISTRO=<jsonl da API> node capturas_rodada5.mjs   (API :3001 SEM mock; Vite :5173)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const { Browser, sleep } = await import(pathToFileURL(process.env.CDP_LIB).href);
const OUT = (process.env.EV_DIR || './saida_rodada5').replace(/\\/g, '/').replace(/\/?$/, '/'); fs.mkdirSync(OUT, { recursive: true });
const REG = process.env.GROQ_REGISTRO; const COMMIT = process.env.COMMIT || 'desconhecido';
const DIST = process.env.DIST_BACKEND; // pasta HealthHub-BackEnd do clone (para extrair os códigos com o MESMO código do servidor)
const req = createRequire(import.meta.url);
const { Cid10Service } = req(DIST + '/dist/modules/ai/application/cid10.service.js');
const { extrairCodigos, anexarConferencia, removerConferencia, CABECALHO_CONFERENCIA } = req(DIST + '/dist/modules/ai/application/cid10-extracao.js');
const cid = new Cid10Service();

const API = 'http://localhost:3001';
const PERGUNTA = 'Quais os diagnósticos diferenciais mais prováveis, os sinais de alerta a pesquisar e a conduta inicial? Sugira o CID provável.';
const login = async (e, s) => (await (await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: s }) })).json());
const lg = await login(process.env.SEED_MEDICO_EMAIL, process.env.SEED_MEDICO_SENHA);
const enf = await login(process.env.SEED_ENFERMEIRO_EMAIL, process.env.SEED_ENFERMEIRO_SENHA);
const api = async (tok, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: b ? JSON.stringify(b) : undefined }); let d = null; try { d = await r.json(); } catch {} return { status: r.status, data: d }; };

// Paciente 100% fictício (os mesmos dados da captura original)
const NOME = 'FICTÍCIO-06'; const suf = String(Date.now()).slice(-6);
const p = (await api(lg.token, 'POST', '/patients', { nome_completo: `${NOME} ${suf}`, cpf: String(30000000000 + Number(suf)).slice(0, 11), idade: 40, sexo: 'F', alergias: 'Dipirona (fictício)', medicamentos_em_uso: 'Nenhum (fictício)', anamnese: 'Dor lombar há 2 dias após esforço, sem febre (texto fictício).' })).data;
const sinais = { frequencia_cardiaca: 76, saturacao_oxigenio: 98, temperatura: 36.6, pressao_arterial: '120/80' };
await api(enf.token, 'POST', `/sinais/${p.id}`, sinais);
const manifesto = []; const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const registros = () => (fs.existsSync(REG) ? fs.readFileSync(REG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const chamadas = [];
function analisar(n, via, reg, replyFinal) {
  const base = { chamada: n, via, http_groq: reg?.http ?? null, finish_reason: reg?.finish_reason ?? null, completion_tokens: reg?.completion_tokens ?? null, reasoning_tokens: reg?.reasoning_tokens ?? null, max_tokens_enviado: reg?.max_tokens_enviado ?? null };
  if (!reg || reg.erro) return { ...base, erro: reg?.erro ? `Groq respondeu HTTP ${reg.http}` : 'sem registro' };
  const original = reg.content; const linhaCid = original.split(/\r?\n/).find((l) => /^\W*CID-10\W*:/i.test(l)) ?? null;
  const codigos = extrairCodigos(original);
  const esperadoFinal = anexarConferencia(original, (c) => cid.conferir(c));
  const confs = codigos.map((c) => cid.conferir(c));
  return { ...base, chars_resposta_modelo: original.length, escreveu_linha_CID10: !!linhaCid, linha_CID10: linhaCid, codigos_extraidos: codigos, conferencia: confs.map((c) => ({ codigo: c.codigo, situacao: c.situacao, descricao_oficial: c.descricao })),
    resposta_final_tem_bloco: replyFinal == null ? null : replyFinal.includes(CABECALHO_CONFERENCIA), resposta_final_igual_ao_esperado_localmente: replyFinal == null ? null : removerConferencia(replyFinal).trim() === original.trim() && replyFinal.trim() === esperadoFinal.trim() };
}

// ── Chamada 1: pela tela (Figura 26) ──
const b = await Browser.launch({ width: 1280, height: 800 });
const pg = await b.newPage({ width: 1280, height: 800, reducedMotion: true });
await pg.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome)});localStorage.setItem('healthhub_termos_aceitos_v1.0','true');}catch(e){}` });
await pg.goto('http://localhost:5173/main/monitor', { settleMs: 3000 });
await pg.eval(() => document.querySelector('input[placeholder="Selecionar..."]')?.focus());
await pg.send('Input.insertText', { text: NOME }); await sleep(1200);
const sel = await pg.eval(() => { const o = document.querySelector('[role=option]'); if (o) { o.click(); return true; } return false; });
await sleep(2500);
const texto = () => pg.eval(() => document.body.innerText);
const antes = registros().length; const t0 = Date.now();
await pg.eval(() => document.querySelector('input[placeholder="Mensagem ou use o microfone..."]')?.focus());
await pg.send('Input.insertText', { text: PERGUNTA });
await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
let resp = ''; const tamPergunta = (await texto()).length;
for (let i = 0; i < 60; i++) { await sleep(2000); resp = await texto(); if (!resp.includes('•••') && resp.length > tamPergunta + 400) break; if (registros().length > antes && registros().at(-1).erro) break; }
await sleep(1500);
const reg1 = registros().slice(antes)[0];
console.log(`chamada 1 (tela): paciente selecionado=${sel}; ${((Date.now() - t0) / 1000).toFixed(0)} s; HTTP Groq=${reg1?.http}`);
if (reg1?.erro) { console.log('A Groq recusou (HTTP ' + reg1.http + '). Parei, sem novas tentativas.'); fs.writeFileSync(OUT + 'chamadas_reais.json', JSON.stringify({ parou: true, motivo: 'HTTP ' + reg1.http, chamadas: [analisar(1, 'tela', reg1, null)] }, null, 1)); await b.close(); process.exit(0); }
const blocoNaTela = resp.includes('Conferência na CID-10');
chamadas.push(analisar(1, 'tela', reg1, blocoNaTela ? (reg1.content + '\n\n' + CABECALHO_CONFERENCIA) : reg1.content)); // na tela só confirmamos o cabeçalho; o texto completo é conferido nas chamadas 2 e 3
await pg.eval(() => { const els = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible'); els.forEach((e) => (e.scrollTop = 0)); }); await sleep(600);
await pg.screenshot({ path: OUT + 'fig26_chat_ia_cid_conferencia_r5.png', format: 'png' });
manifesto.push({ arquivo: 'fig26_chat_ia_cid_conferencia_r5.png', figura: '26', tela: 'Chat de IA com a resposta REAL da Groq (prompt novo): topo da resposta, mesmo recorte da captura original (novo04)', perfil: 'Médico', paciente: `${NOME} ${suf}`, data_hora: agora(), commit: COMMIT, resultado: 'OK', observacoes: `Provedor REAL (Groq, openai/gpt-oss-120b). Bloco de conferência presente na tela: ${blocoNaTela}. O bloco fica no FIM da resposta e normalmente não cabe neste recorte: veja fig26b` });
await pg.eval(() => { const els = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible'); els.forEach((e) => (e.scrollTop = e.scrollHeight)); }); await sleep(800);
await pg.screenshot({ path: OUT + 'fig26b_chat_ia_cid_bloco_conferencia_r5.png', format: 'png' });
manifesto.push({ arquivo: 'fig26b_chat_ia_cid_bloco_conferencia_r5.png', figura: '26 (parte 2)', tela: 'Mesma resposta, rolada até o FIM: bloco "Conferência na CID-10 (DATASUS, versão 2008)"', perfil: 'Médico', paciente: `${NOME} ${suf}`, data_hora: agora(), commit: COMMIT, resultado: blocoNaTela ? 'OK' : 'FALHA', observacoes: 'Mesmo recorte 1280 x 800; só a rolagem do chat muda (novo recorte vertical: fim da resposta)' });
await b.close();

// ── Chamadas 2 e 3: mesmo endpoint, mesmo corpo que a tela envia (inclui a saudação do assistente no histórico, como a tela faz) ──
const corpo = { message: PERGUNTA, patientContext: { alergias: 'Dipirona (fictício)', medicamentos: 'Nenhum (fictício)', anamnese: 'Dor lombar há 2 dias após esforço, sem febre (texto fictício).', sinaisVitais: sinais }, history: [{ role: 'assistant', content: `Olá! Analisando **${NOME} ${suf}**. Como posso ajudar neste caso?` }] };
for (const n of [2, 3]) {
  await sleep(14000);
  const ant = registros().length;
  const r = await api(lg.token, 'POST', `/patients/${p.id}/chat`, corpo);
  const reg = registros().slice(ant)[0];
  console.log(`chamada ${n} (API): HTTP ${r.status}; HTTP Groq=${reg?.http}`);
  if (r.status !== 201 && r.status !== 200) { chamadas.push({ chamada: n, via: 'api', http_api: r.status, http_groq: reg?.http ?? null, corpo_resposta: JSON.stringify(r.data).slice(0, 160) }); console.log('Falha: parei, sem novas tentativas.'); break; }
  chamadas.push({ ...analisar(n, 'api', reg, r.data.reply), http_api: r.status, chars_resposta_final: r.data.reply.length });
  if (n === 3 || r.status !== 201) { /* fim */ }
}
fs.writeFileSync(OUT + 'chamadas_reais.json', JSON.stringify({ commit: COMMIT, pergunta: PERGUNTA, paciente: `${NOME} ${suf} (fictício)`, chamadas }, null, 1));
const cab = ['arquivo', 'figura', 'tela', 'perfil', 'paciente', 'data_hora', 'commit', 'resultado', 'observacoes'];
fs.writeFileSync(OUT + 'figuras_manifesto.csv', [cab.join(','), ...manifesto.map((m) => cab.map((c) => csvCell(m[c])).join(','))].join(String.fromCharCode(10)) + String.fromCharCode(10));
console.log(JSON.stringify(chamadas.map((c) => ({ n: c.chamada, finish: c.finish_reason, linhaCID10: c.escreveu_linha_CID10, codigos: c.codigos_extraidos }))));
