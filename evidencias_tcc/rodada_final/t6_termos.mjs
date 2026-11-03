// Tarefa 6 (parte 1) — captura do modal de termos de uso no primeiro acesso (conta fictícia) e verificação do texto exibido.
// Uso: source /tmp/testenv_perf.sh; EV_DIR=<pasta> node t6_termos.mjs   (API 3001 e Vite 5173 de pé; banco de teste isolado)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { Browser, sleep } = await import(pathToFileURL('C:/Users/642mi/Documents/HealthHub_Mono/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs').href);
const OUT = process.env.EV_DIR; fs.mkdirSync(OUT, { recursive: true });
const lg = await (await fetch('http://localhost:3001/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
const b = await Browser.launch(); const p = await b.newPage({ width: 1280, height: 800, reducedMotion: true });
// Primeiro acesso: sessão iniciada, mas SEM a marca de termos aceitos
await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear();localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome)});}catch(e){}` });
await p.goto('http://localhost:5173/main', { settleMs: 2500 });
const modal = await p.eval(() => !!document.querySelector('[role=dialog]'));
const texto = await p.eval(() => document.querySelector('[role=dialog]')?.innerText ?? '');
const log = [`modal de termos aberto no primeiro acesso: ${modal}`, `Groq: ${/Groq/.test(texto)} | gpt-oss-120b: ${/gpt-oss-120b/.test(texto)} | Whisper: ${/Whisper/.test(texto)}`, `Ollama: ${/ollama/i.test(texto)} | Qwen: ${/qwen/i.test(texto)} | Llama: ${/llama/i.test(texto)}`, `texto cita que o nome NÃO é enviado: ${/O nome, o CPF, o RG, o telefone e o endereço não são enviados/.test(texto)}`, `texto ainda diz que o nome é enviado: ${/o nome completo é enviado/i.test(texto)}`];
// Rola o texto em partes e captura cada uma
const alt = await p.eval(() => { const v = document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'); return v ? { h: v.scrollHeight, c: v.clientHeight } : null; });
log.push(`área de rolagem: ${JSON.stringify(alt)}`);
const partes = alt ? Math.ceil(alt.h / Math.max(1, alt.c - 40)) : 1;
for (let i = 0; i < partes; i++) {
  await p.eval((i) => { const v = document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'); if (v) v.scrollTop = i * (v.clientHeight - 40); }, i);
  await sleep(500);
  const nome = i === 0 ? 'termos-uso.png' : `termos-uso-${i + 1}.png`;
  await p.screenshot({ path: `${OUT}/${nome}`, format: 'png' }); log.push('captura ' + nome);
}
fs.writeFileSync(`${OUT}/t6_termos_verificacao.txt`, log.join('\n') + '\n'); console.log(log.join('\n'));
await b.close();
