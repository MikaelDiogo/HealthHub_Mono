// TF08 (interface) — o que a tela mostra quando o provedor de IA simulado falha. API com mock de IA, banco de teste isolado, paciente fictício.
// Uso: source /tmp/testenv_tf.sh; EV_DIR=<pasta> node tf08_ui.mjs   (API 3001 com mock + Vite 5173 de pé)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const CDP_LIB = process.env.CDP_LIB;
if (!CDP_LIB) throw new Error('Defina CDP_LIB com o caminho do cliente Chrome DevTools Protocol (cdp.mjs) usado nos testes de tela. Veja o README desta pasta.');
const { Browser, sleep } = await import(pathToFileURL(CDP_LIB).href);
const OUT = process.env.EV_DIR || './saida_tf08'; fs.mkdirSync(OUT, { recursive: true });
const lg = await (await fetch('http://localhost:3001/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
const b = await Browser.launch({ width: 1280, height: 800 }); const p = await b.newPage({ width: 1280, height: 800, reducedMotion: true });
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome)});localStorage.setItem('healthhub_termos_aceitos_v1.0','true');}catch(e){}` });
await p.goto('http://localhost:5173/main/monitor', { settleMs: 3000 });
await p.eval(() => document.querySelector('input[placeholder="Selecionar..."]')?.focus());
await p.send('Input.insertText', { text: 'FICTÍCIO-01' }); await sleep(1200);
const sel = await p.eval(() => { const o = document.querySelector('[role=option]'); if (o) { o.click(); return o.textContent; } return null; });
await sleep(2500);
const log = [`# TF08 (interface) — ${new Date().toISOString()}`, `paciente selecionado: ${sel}`];
const enviar = async (msg) => {
  await p.eval(() => document.querySelector('input[placeholder="Mensagem ou use o microfone..."]')?.focus());
  await p.send('Input.insertText', { text: msg });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(4500);
};
const vitais = () => p.eval(() => /36[.,]6|37[.,]7|96|90/.test(document.body.innerText) && /bpm/.test(document.body.innerText));
for (const [msg, arq] of [['__ERRO_500__', 'tf08-falha-500.png'], ['__VAZIO__', 'tf08-resposta-vazia.png']]) {
  await enviar(msg);
  const t = await p.eval(() => document.body.innerText);
  const ultimas = t.split('\n').filter((l) => l.trim()).slice(-8).join(' | ');
  log.push(`${msg}: sinais vitais ainda na tela: ${await vitais()}; contém "SIMULADA — NÃO É": ${/SIMULADA — NÃO/.test(t)}; contém "Erro ao conectar": ${/Erro ao conectar/i.test(t)}; contém "indisponível": ${/indispon/i.test(t)}; últimas linhas: ${ultimas.slice(0, 260)}`);
  await p.screenshot({ path: `${OUT}/${arq}`, format: 'png' }); log.push('captura ' + arq);
}
fs.writeFileSync(`${OUT}/tf08_ui.md`, log.join('\n') + '\n'); console.log(log.join('\n'));
await b.close();
