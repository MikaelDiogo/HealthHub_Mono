// Biblioteca da execução dos testes (ambiente isolado, dados fictícios).
// Lê credenciais SÓ de variáveis de ambiente do banco de teste (nunca do .env de desenvolvimento).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { Browser, sleep } = await import(pathToFileURL('C:/Users/642mi/Documents/HealthHub_Mono/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs').href);
export { Browser, sleep };

export const API = 'http://localhost:3001';
export const WEB = 'http://localhost:5173';
export const EV = process.env.EV_DIR || 'C:/Users/642mi/Documents/HealthHub_Mono/evidencias_testes_2026-10-29';
const RES = process.env.EV_DIR ? `${EV}/resultados.json` : `${EV}/runner/resultados.json`;
mkdirSync(`${EV}/prints`, { recursive: true });

export const CRED = {
  medico: { email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA },
  enfermeiro: { email: process.env.SEED_ENFERMEIRO_EMAIL, password: process.env.SEED_ENFERMEIRO_SENHA },
  recepcionista: { email: process.env.SEED_RECEPCIONISTA_EMAIL, password: process.env.SEED_RECEPCIONISTA_SENHA },
};
if (!CRED.medico.email) throw new Error('Rode com o ambiente de teste carregado (source /tmp/testenv.sh).');

// ── Registro de resultados (acrescenta; nunca sobrescreve execução anterior) ──
export function registrar(r) {
  const todos = existsSync(RES) ? JSON.parse(readFileSync(RES, 'utf8')) : [];
  todos.push({ ...r, registrado_em: agoraBR() });
  writeFileSync(RES, JSON.stringify(todos, null, 2));
  console.log(`[${r.id}] ${r.resultado} — ${String(r.observado).slice(0, 160)}`);
}
export const agoraBR = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export const horaBR = () => new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

// ── API (usada para preparar dados e conferir a verdade no backend) ──
export async function apiLogin(papel) {
  const r = await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CRED[papel]) });
  if (!r.ok) throw new Error('login ' + papel + ' ' + r.status);
  const j = await r.json();
  const call = async (method, path, body) => {
    const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + j.token }, body: body ? JSON.stringify(body) : undefined });
    const txt = await res.text();
    let data; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    return { status: res.status, data };
  };
  call.session = { token: j.token, role: j.role, nome: j.nome };
  return call;
}

// ── Navegador ──
let browser;
export async function abrir() { browser = browser ?? await Browser.launch(); return browser; }
export async function fechar() { if (browser) await browser.close(); browser = undefined; }

export async function pagina(papel, { width = 1440, height = 900, mobile = false } = {}) {
  const b = await abrir();
  const page = await b.newPage({ width, height, mobile, reducedMotion: true });
  const sess = papel ? (await apiLogin(papel)).session : null;
  const src = sess
    ? `localStorage.setItem('token',${JSON.stringify(sess.token)});localStorage.setItem('role',${JSON.stringify(sess.role)});localStorage.setItem('nome',${JSON.stringify(sess.nome)});localStorage.setItem('healthhub_termos_aceitos_v1.0','true');`
    : `localStorage.clear();localStorage.setItem('healthhub_termos_aceitos_v1.0','true');`;
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{${src}}catch(e){}` });
  return page;
}

export const ir = (page, rota, ms = 1800) => page.goto(WEB + rota, { settleMs: ms });
export const url = (page) => page.eval('location.pathname');

export async function foto(page, nome, { borrarEmail = false } = {}) {
  if (borrarEmail) await page.eval(() => { const s = document.createElement('style'); s.id = '__blur'; s.textContent = 'input{-webkit-text-fill-color:transparent !important;color:transparent !important}'; document.head.appendChild(s); });
  await sleep(450);
  await page.screenshot({ path: `${EV}/prints/${nome}`, format: 'png' });
  if (borrarEmail) await page.eval(() => document.getElementById('__blur')?.remove());
  return nome;
}

// Clica no menor elemento visível cujo texto bate (exato, ou "parcial"); `dentro` restringe ao cartão do texto âncora.
export const clicar = (page, texto, { parcial = false, dentro } = {}) => page.eval(({ texto, parcial, dentro }) => {
  const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  let raiz = document;
  if (dentro) {
    const anc = [...document.querySelectorAll('body *')].filter(el => vis(el) && el.childElementCount === 0 && el.textContent.trim().startsWith(dentro));
    let achou = null;
    for (const a0 of anc) { let a = a0; while (a) { const bs = [...a.querySelectorAll('button,a,[role=button],[role=tab]')].filter(b => vis(b) && (parcial ? b.textContent.includes(texto) : b.textContent.trim() === texto)); if (bs.length) { achou = a; break; } a = a.parentElement; if (a && a.matches('main,body,#root')) break; } if (achou) break; }
    if (!achou) return 'âncora/botão não encontrado: ' + dentro + ' → ' + texto;
    raiz = achou;
  }
  const casa = (el) => vis(el) && (parcial ? el.textContent.includes(texto) : el.textContent.trim() === texto);
  let c = [...raiz.querySelectorAll('button,a,[role=tab],[role=option],[role=button]')].filter(casa);
  if (!c.length) c = [...raiz.querySelectorAll('label,span,p,div')].filter(casa);
  if (!c.length) return 'não encontrado: ' + texto;
  c.sort((a, b) => a.textContent.length - b.textContent.length);
  const alvo = c[0].closest('button,a,label,[role=tab],[role=option],[role=button]') || c[0];
  if (alvo.disabled) return 'desabilitado: ' + texto;
  alvo.scrollIntoView({ block: 'center' });
  const r = alvo.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, { texto, parcial, dentro }).then((r) => mouse(page, r));

export async function passo(page, texto, opts) { const r = await clicar(page, texto, opts); await sleep(opts?.espera ?? 900); return r; }

// Digita num campo pelo rótulo (começa com…) ou placeholder.
export async function digitar(page, rotulo, texto) {
  const ok = await page.eval(({ rotulo }) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    let el = null;
    for (const l of document.querySelectorAll('label')) { if (vis(l) && l.textContent.trim().replace(/\s*\*$/, '').startsWith(rotulo)) { el = document.getElementById(l.htmlFor) || l.querySelector('input,textarea'); if (el) break; } }
    if (!el) el = [...document.querySelectorAll('input,textarea')].find(i => vis(i) && (i.placeholder || '').startsWith(rotulo));
    if (!el) return false;
    el.focus(); el.select?.(); return true;
  }, { rotulo });
  if (!ok) return false;
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (texto) await page.send('Input.insertText', { text: texto });
  await sleep(120);
  return true;
}

// O campo Sexo agora é uma lista (Masculino/Feminino): abre a lista e clica na opção (grava M ou F).
export async function escolherSexo(page, rotulo) {
  await clicar(page, 'Sexo').then((r) => r); await sleep(400);
  const r = await passo(page, rotulo, { espera: 500 });
  return r;
}

export const enter = async (page) => { await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(700); };
export const esc = async (page) => { await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(500); };
export const texto = (page) => page.eval(() => document.body.innerText);
export const temTexto = async (page, t) => (await texto(page)).includes(t);

// Captura alert()/diálogos e respostas HTTP do app durante uma ação
export async function observarRede(page) {
  const eventos = [];
  await page.send('Network.enable');
  page.browser.on(page.sessionId, 'Network.responseReceived', (p) => { if (p.response.url.startsWith(API)) eventos.push({ url: p.response.url.replace(API, ''), status: p.response.status, t: Date.now() }); });
  return eventos;
}

export async function criarPaciente(api, nome, extra = {}) {
  const r = await api('POST', '/patients', { nome_completo: nome, cpf: extra.cpf, idade: extra.idade ?? 40, sexo: extra.sexo ?? 'M', ...extra.campos });
  return r;
}
export const fila = async (api) => (await api('GET', '/fila')).data;

// Clica no botão visível cujo texto bate com a regex
export const clicarRe = (page, re, { dentro } = {}) => page.eval(({ src, flags, dentro }) => {
  const re = new RegExp(src, flags);
  const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  let raiz = document;
  if (dentro) {
    const anc = [...document.querySelectorAll('body *')].filter(el => vis(el) && el.childElementCount === 0 && el.textContent.trim().startsWith(dentro));
    for (const a0 of anc) { let a = a0; while (a && !a.matches('main,body,#root')) { if ([...a.querySelectorAll('button,a,[role=button]')].some(b => vis(b) && re.test(b.textContent.trim()))) { raiz = a; break; } a = a.parentElement; } if (raiz !== document) break; }
    if (raiz === document) return 'âncora não encontrada: ' + dentro;
  }
  const b = [...raiz.querySelectorAll('button,a,[role=button],[role=tab]')].find(x => vis(x) && re.test(x.textContent.trim()));
  if (!b) return 'não encontrado: ' + src;
  if (b.disabled) return 'desabilitado: ' + src;
  b.scrollIntoView({ block: 'center' });
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, { src: re.source, flags: re.flags, dentro }).then((r) => mouse(page, r));
export async function passoRe(page, re, opts) { const r = await clicarRe(page, re, opts); await sleep(opts?.espera ?? 900); return r; }

// Execução de um caso: se a AUTOMAÇÃO quebrar (não o sistema), não registra resultado — para investigar.
export async function caso(fn) { try { await fn(); } catch (e) { console.error('AUTOMAÇÃO QUEBROU:', e.message); await fechar(); process.exit(2); } }

// Admite pela interface (modal de admissão). Retorna { senha, resposta }
export async function admitirUI(page, nome, motivo) {
  const ev = await observarRede(page);
  // Com clique real, o botão do cabeçalho fica sob a sobreposição do modal: só abre se ainda estiver fechado
  if (!(await texto(page)).includes('Admitir na esteira')) await passo(page, 'Admitir Paciente');
  await digitar(page, 'Nome ou CPF', nome.split(' —')[0]);
  await sleep(500);
  const r1 = await passo(page, nome.split(' —')[0], { parcial: true, espera: 900 });
  const t = (await texto(page)).split('Admitir na esteira').pop();
  const senha = (t.match(/Senha\s+(PR-\d+)/) || [])[1];
  if (motivo) await digitar(page, 'Motivo da visita', motivo);
  const r2 = await passoRe(page, /^Admitir( como| —)/, { espera: 1500 });
  return { senha, r1, r2, eventos: ev };
}

async function mouse(page, r) {
  if (typeof r === 'string') return r;
  await sleep(120);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
  return 'ok';
}
export { mouse };
