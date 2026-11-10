// Capturas de tela da rodada 4 (429 da IA, termos e política), a partir do clone limpo do commit X. Banco de TESTE isolado, dados FICTÍCIOS, IA SIMULADA (mock).
// Viewport 1280 x 800, tema claro, zoom 100%, PNG, mesmo recorte das capturas correspondentes da rodada 2 (novo08 = Figura 28; novo03 = Figura 29; novo10 = Figura 30).
// Atenção: nesta rodada "Figura 30" é a 1ª página do PDF da política; a "fig30_painel_atencao_f14" da rodada 3 é OUTRA figura (arquivos com sufixo _r4).
// Uso: source <ambiente do banco de teste>; CDP_LIB=<cdp.mjs> EV_DIR=<pasta> COMMIT=<hash> node capturas_rodada4.mjs   (API em :3001 com o mock e Vite em :5173)
// Uma captura que falha NÃO é ocultada: entra no manifesto como FALHA.
import fs from 'node:fs';
import { pagina, ir, passo, passoRe, digitar, escolherSexo, clicar, sleep, texto, fechar, abrir, apiLogin, admitirUI, mouse, esc } from './cenarios22/lib.mjs';

const OUT = (process.env.EV_DIR || './saida_capturas').replace(/\\/g, '/').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const COMMIT = process.env.COMMIT || 'desconhecido';
const VP = { width: 1280, height: 800 };
const PDFS = OUT + 'pdfs_gerados/'; fs.mkdirSync(PDFS, { recursive: true });

const manifesto = [];
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
async function foto(page, arquivo, meta) {
  await sleep(600);
  await page.screenshot({ path: OUT + arquivo, format: 'png' });
  manifesto.push({ arquivo, ...meta, data_hora: agora(), commit: COMMIT, resultado: 'OK' });
  console.log('✓', arquivo);
}
const tente = async (nome, fn) => { try { await fn(); } catch (e) { manifesto.push({ arquivo: `(FALHA) ${nome}`, observacoes: String(e.message).slice(0, 240), data_hora: agora(), commit: COMMIT, resultado: 'FALHA' }); console.log('✗', nome, e.message); } };
const marcarRadio = (p, v) => p.eval((v) => document.querySelector(`input[type=radio][value=${v}]`)?.click(), v).then(() => sleep(1500));
const buscar = async (p, nome) => { await p.eval(() => document.querySelector('input[aria-label="Pesquisar paciente por nome ou CPF"]')?.focus()); await p.send('Input.insertText', { text: nome }); await sleep(1500); };
const abrirConversa = async (p, nome) => { await ir(p, '/chat', 3500); await passo(p, 'Nova mensagem', { espera: 1000 }); await passo(p, nome, { parcial: true, espera: 1500 }); };
const rolarFoco = (p) => p.eval(() => [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Paciente em foco')?.scrollIntoView({ block: 'start' })).then(() => sleep(1200));
const novaPagina = (papel) => pagina(papel, VP);
// Primeira página de um PDF como PNG: abre o arquivo no visualizador do navegador e recorta só a folha (sem a barra do visualizador).
async function pdfParaPng(pdfAbs, arquivo, meta) {
  const pg = await b.newPage({ ...VP, reducedMotion: true });
  const url = 'file:///' + pdfAbs.replace(/\\/g, '/').split('/').map((x, i) => (i === 0 ? x : encodeURIComponent(x))).join('/');
  // #toolbar=0&navpanes=0&view=Fit: esconde a barra do visualizador e encaixa a primeira página inteira na janela
  await pg.goto(url + '#toolbar=0&navpanes=0&scrollbar=0&view=Fit&page=1', { settleMs: 5000 });
  await pg.screenshot({ path: OUT + arquivo, format: 'png' });
  manifesto.push({ arquivo, ...meta, data_hora: agora(), commit: COMMIT, resultado: 'OK' });
  console.log('✓', arquivo);
  await pg.close();
}

// ── Dados fictícios pela API ──
const med = await apiLogin('medico'), enf = await apiLogin('enfermeiro'), rec = await apiLogin('recepcionista');
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let n = 0; const suf = String(Date.now()).slice(-6);
const cpf = () => String(81000000000 + Number(suf) * 10 + (++n)).slice(0, 11);
const SV = (o = {}) => ({ saturacao_oxigenio: 98, frequencia_cardiaca: 76, temperatura: 36.6, pressao_arterial: '120/80', ...o });
async function paciente(nome, idade, sexo, extra = {}) { return (await rec('POST', '/patients', { nome_completo: nome, cpf: cpf(), idade, sexo, ...extra })).data; }
async function admitir(p, senha, motivo) { return (await rec('POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, chegada: brt(), status: 'Aguardando Triagem', ...(motivo ? { motivo_visita: motivo } : {}) })).data; }
async function classificar(f, cor, just) { await enf('PUT', `/fila/${f.id}`, { status: 'Em Triagem (Enfermeiro)' }); await enf('PUT', `/fila/${f.id}`, { status: 'Aguardando Atendimento', gravidade: cor, ...(just ? { justificativa: just } : {}) }); }
const pausa = () => sleep(1100); // a ordem de chegada usa o instante gravado no servidor

const b = await abrir();
await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: PDFS.replace(/\//g, '\\') });


await tente('termos de uso: seção da IA (novo03)', async () => {
  const lg = await (await fetch('http://localhost:3001/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
  const p = await b.newPage({ ...VP, reducedMotion: true });
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear();localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome ?? '')});}catch(e){}` });
  await p.goto('http://localhost:5173/main', { settleMs: 2500 });
  const achou = await p.eval(() => { const v = document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'); const alvo = [...document.querySelectorAll('[role=dialog] *')].find((e) => e.childElementCount === 0 && /plataforma Groq/.test(e.textContent)); if (!alvo || !v) return false; alvo.scrollIntoView({ block: 'center' }); return true; });
  if (!achou) throw new Error('modal de termos ou trecho da IA não encontrado');
  await sleep(500);
  const txtT = await p.eval(() => document.querySelector('[role=dialog]')?.innerText || '');
  if (/nascimento/i.test(txtT)) throw new Error('o termo exibido cita "nascimento"');
  await foto(p, 'fig29_termos_ia_r4.png', { figura: '29', tela: 'Termos de uso, seção do assistente de IA: o nome não é enviado; cita Groq, gpt-oss-120b e Whisper', perfil: 'Médico (primeiro acesso)', paciente: '-', observacoes: 'Parte do texto que explica a figura (a janela é longa); o rodapé com o crédito de autoria não aparece nesta captura' });
  await p.close();
});


await tente('política em PDF (novo10)', async () => {
  const p = await novaPagina('medico');
  await ir(p, '/main/politica', 2000);
  const antes = new Set(fs.readdirSync(PDFS));
  await passo(p, 'Baixar PDF', { parcial: true, espera: 4500 });
  const novos = fs.readdirSync(PDFS).filter((f) => !antes.has(f) && /Politica/i.test(f));
  await p.close();
  if (!novos[0]) throw new Error('o PDF da política não foi gerado');
  const txt = (await import('node:child_process')).spawnSync('pdftotext', ['-enc', 'UTF-8', PDFS + novos[0], '-'], { encoding: 'utf8' }).stdout || '';
  const confere = `nome não é enviado à IA=${/nome[^.]{0,80}n[aã]o s[aã]o enviados|nao sao enviados|nao e enviado|não é enviado/i.test(txt)}; cita Groq=${/Groq/.test(txt)}; cita Ollama/Qwen/Llama=${/ollama|qwen|llama/i.test(txt)}`;
  if (/nascimento/i.test(txt)) throw new Error('o PDF da política cita "nascimento"');
  await pdfParaPng(PDFS + novos[0], 'fig30_politica_pdf_pag1_r4.png', { figura: '30', tela: 'Primeira página do PDF da política de dados regenerado', perfil: 'Médico', paciente: '-', observacoes: `Conferência do texto do PDF inteiro (pdftotext): ${confere}` });
});

await tente('erro 429 simulado (novo08)', async () => {
  await paciente('FICTÍCIO-01', 45, 'M');
  const p = await novaPagina('enfermeiro');
  await ir(p, '/main/monitor', 2500);
  await p.eval(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder?.startsWith('Selecionar')); i?.click(); i?.focus(); }); await sleep(600);
  await p.send('Input.insertText', { text: 'FICTÍCIO-01' }); await sleep(1200);
  await p.eval(() => document.querySelector('[role=option]')?.click()); await sleep(2000);
  await p.eval(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder?.startsWith('Mensagem')); i?.focus(); });
  await p.send('Input.insertText', { text: '__ERRO_429__' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(3500);
  const txt429 = await texto(p);
  if (!txt429.includes("O assistente de IA está com muitas solicitações no momento. Aguarde cerca de um minuto e tente novamente.")) throw new Error('a mensagem do 429 não apareceu na tela');
  await foto(p, 'fig28_429_chat_r4.png', { figura: '28', tela: 'O que o usuário vê quando o provedor de IA recusa a chamada por limite (HTTP 429 devolvido pelo backend com mensagem própria)', perfil: 'Enfermeiro', paciente: 'FICTÍCIO-01', observacoes: 'SIMULADO: a resposta 429 foi produzida pelo mock da IA (nenhuma chamada real foi feita). Rotular a figura como simulada' });
  await p.close();
});

await fechar();
const colunas = ['arquivo', 'figura', 'tela', 'perfil', 'paciente', 'data_hora', 'commit', 'resultado', 'observacoes'];
fs.writeFileSync(OUT + 'figuras_manifesto.csv', [colunas.join(','), ...manifesto.map((m) => colunas.map((c) => csvCell(m[c])).join(','))].join(String.fromCharCode(10)) + String.fromCharCode(10));
console.log(`${manifesto.filter((m) => m.resultado === 'OK').length} capturas OK, ${manifesto.filter((m) => m.resultado !== 'OK').length} falhas`);
