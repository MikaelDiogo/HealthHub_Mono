// Tarefa 6 (b) e (c) — capturas com o provedor REAL: chat de IA com sugestão de CID e transcrição de áudio.
// Paciente 100% fictício. Áudio: voz sintética (Windows, pt-BR) lido como "microfone" falso do navegador.
// A chave da Groq vive só no processo da API; este script não a vê. Viewport 1280 × 800, tema claro.
// Uso: source /tmp/testenv_perf.sh; EV_DIR=<pasta> node t6_capturas_ia.mjs   (API 3001 sem mock + Vite 5173 de pé)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { Browser, sleep } = await import(pathToFileURL('C:/Users/642mi/Documents/HealthHub_Mono/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs').href);
const OUT = process.env.EV_DIR; fs.mkdirSync(OUT, { recursive: true });
const WAV = 'C:/Users/642mi/Documents/HealthHub_Mono/evidencias_tcc/rodada_final/audio_ficticio/ditado_ficticio.wav';
const API = 'http://localhost:3001';
const log = []; const L = (s) => { console.log(s); log.push(s); };
const lg = await (await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
const rec = await (await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_ENFERMEIRO_EMAIL, password: process.env.SEED_ENFERMEIRO_SENHA }) })).json();
const api = async (tok, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json().catch(() => null) }; };

// Paciente fictício com sinais vitais
const NOME = 'Paciente Ficticio Captura';
const suf = String(Date.now()).slice(-6);
const p = (await api(lg.token, 'POST', '/patients', { nome_completo: `${NOME} ${suf}`, cpf: String(30000000000 + Number(suf)).slice(0, 11), idade: 40, sexo: 'F', alergias: 'Dipirona (fictício)', medicamentos_em_uso: 'Nenhum (fictício)', anamnese: 'Dor lombar há 2 dias após esforço, sem febre (texto fictício).' })).data;
await api(rec.token, 'POST', `/sinais/${p.id}`, { frequencia_cardiaca: 76, saturacao_oxigenio: 98, temperatura: 36.6, pressao_arterial: '120/80' });
L(`paciente fictício criado: ${NOME} ${suf}`);

async function sessao(extraArgs = []) {
  const b = await Browser.launch({ width: 1280, height: 800, extraArgs });
  const pg = await b.newPage({ width: 1280, height: 800, reducedMotion: true });
  await pg.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome)});localStorage.setItem('healthhub_termos_aceitos_v1.0','true');}catch(e){}` });
  await pg.goto('http://localhost:5173/main/monitor', { settleMs: 3000 });
  // seleciona o paciente
  await pg.eval(() => document.querySelector('input[placeholder="Selecionar..."]')?.focus());
  await pg.send('Input.insertText', { text: NOME }); await sleep(1200);
  const ok = await pg.eval(() => { const o = document.querySelector('[role=option]'); if (o) { o.click(); return true; } return false; });
  await sleep(2500);
  return { b, pg, ok };
}
const texto = (pg) => pg.eval(() => document.body.innerText);

// (b) Chat de IA com sugestão de CID — provedor real
{
  const { b, pg, ok } = await sessao();
  L(`(b) paciente selecionado na tela: ${ok}`);
  const t0 = Date.now();
  await pg.eval(() => document.querySelector('input[placeholder="Mensagem ou use o microfone..."]')?.focus());
  await pg.send('Input.insertText', { text: 'Quais os diagnósticos diferenciais mais prováveis, os sinais de alerta a pesquisar e a conduta inicial? Sugira o CID provável.' });
  await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  let resp = '';
  for (let i = 0; i < 40; i++) { await sleep(2000); resp = await texto(pg); if (/CID/i.test(resp) && !/Pensando|Analisando/.test(resp.slice(-200))) break; }
  L(`(b) resposta apareceu em ~${((Date.now() - t0) / 1000).toFixed(0)} s; contém "CID": ${/CID/i.test(resp)}; contém "SIMULADA": ${/SIMULADA/i.test(resp)}`);
  await pg.eval(() => { const els = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible'); els.forEach((e) => (e.scrollTop = 0)); });
  await sleep(600);
  await pg.screenshot({ path: `${OUT}/chat-ia-cid.png`, format: 'png' }); L('captura chat-ia-cid.png');
  await b.close();
}

// (c) Transcrição de áudio — microfone falso lendo o WAV sintético
{
  const { b, pg, ok } = await sessao(['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`]);
  L(`(c) paciente selecionado na tela: ${ok}`);
  const clicarMic = () => pg.eval(() => { const b = document.querySelector('button[title="Gravar áudio"], button[title="Parar gravação"]'); if (b && !b.disabled) { b.click(); return b.title; } return null; });
  L(`(c) clique no microfone: ${await clicarMic()}`);
  await sleep(6000);
  await pg.screenshot({ path: `${OUT}/transcricao-audio-1-gravando.png`, format: 'png' }); L('captura transcricao-audio-1-gravando.png');
  await sleep(40000); // dura ~42 s o áudio
  L(`(c) parar gravação: ${await clicarMic()}`);
  await sleep(700);
  await pg.screenshot({ path: `${OUT}/transcricao-audio-2-transcrevendo.png`, format: 'png' }); L('captura transcricao-audio-2-transcrevendo.png');
  let valor = '';
  for (let i = 0; i < 40; i++) { await sleep(1500); valor = await pg.eval(() => document.querySelector('input[placeholder^="Mensagem"]')?.value ?? ''); if (valor) break; }
  L(`(c) texto transcrito no campo (${valor.length} caracteres): "${valor.slice(0, 160)}${valor.length > 160 ? '…' : ''}"`);
  await pg.screenshot({ path: `${OUT}/transcricao-audio.png`, format: 'png' }); L('captura transcricao-audio.png');
  await b.close();
}
fs.writeFileSync(`${OUT}/t6_capturas_ia_verificacao.txt`, `${new Date().toISOString()}\n` + log.join('\n') + '\n');
