// Tarefa 5 — desempenho e disponibilidade. API local (porta 3001), banco de teste isolado (healthhub_test_perf), dados fictícios.
// Uso: source /tmp/testenv_perf.sh; node desempenho.mjs <fila|escrita|disp>
//   fila   : GET /fila e GET /metricas com 20, 100 e 500 entradas; 200 requisições sequenciais e 200 com 10 simultâneas
//   escrita: POST /fila (100) e PUT /fila/:id classificando a cor (100)
//   disp   : tempo até /health voltar a 200 após reiniciar (a) o banco, (b) a API, (c) os dois; 5 repetições cada
// Estatísticas em ms: mínimo, p50, p95, p99, máximo. Não lê nem imprime credenciais (SEED_* do ambiente).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
const API = 'http://localhost:3001';
const DB = process.env.DB_NAME;
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const fase = process.argv[2];
const sql = (q) => execFileSync('docker', ['exec', '-i', 'healthhub-test-db', 'psql', '-U', 'postgres', '-d', DB, '-qAtc', q], { encoding: 'utf8' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(t, m, p, b) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); const x = await r.text(); let d = null; try { d = x ? JSON.parse(x) : null; } catch { d = x; } return { status: r.status, data: d }; }
const login = async (p) => (await req(null, 'POST', '/login', { email: process.env[`SEED_${p}_EMAIL`], password: process.env[`SEED_${p}_SENHA`] })).data.token;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
const stats = (a) => ({ n: a.length, min: Math.min(...a), p50: pct(a, 50), p95: pct(a, 95), p99: pct(a, 99), max: Math.max(...a) });
const f = (x) => (typeof x === 'number' ? x.toFixed(1) : x);
const linhas = [];
const reg = (cenario, endpoint, modo, a, extra = '') => { const s = stats(a); linhas.push(`${cenario},${endpoint},${modo},${s.n},${f(s.min)},${f(s.p50)},${f(s.p95)},${f(s.p99)},${f(s.max)},${extra}`); console.log(`${cenario} ${endpoint} ${modo}: n=${s.n} min=${f(s.min)} p50=${f(s.p50)} p95=${f(s.p95)} p99=${f(s.p99)} max=${f(s.max)} ms ${extra}`); };
async function timed(fn) { const t0 = performance.now(); const r = await fn(); return [performance.now() - t0, r]; }
const cab = 'cenario,endpoint,modo,n,min_ms,p50_ms,p95_ms,p99_ms,max_ms,observacao';

if (fase === 'fila') {
  const med = await login('MEDICO');
  for (const tam of [20, 100, 500]) {
    sql(`DELETE FROM fila_pacientes; DELETE FROM visitas WHERE motivo_visita='carga fictícia'; DELETE FROM pacientes WHERE nome_completo LIKE 'Carga %';`);
    sql(`INSERT INTO pacientes (nome_completo,cpf,idade,sexo) SELECT 'Carga '||g, '5'||lpad(g::text,10,'0'), 20+(g%60), 'F' FROM generate_series(1,${tam}) g;
         INSERT INTO fila_pacientes (paciente_id,nome,idade,senha,chegada,status,gravidade)
           SELECT id, nome_completo, idade, 'PR-'||lpad((row_number() over (order by cpf))::text,3,'0'), '03/11/2026, 10:00',
                  (ARRAY['Aguardando Triagem','Em Triagem (Enfermeiro)','Aguardando Atendimento','Em Consulta (Médico)'])[1+(row_number() over (order by cpf))%4],
                  (ARRAY['Vermelho','Laranja','Amarelo','Verde','Azul',NULL])[1+(row_number() over (order by cpf))%6]
           FROM pacientes WHERE nome_completo LIKE 'Carga %';
         INSERT INTO visitas (paciente_id,motivo_visita,desfecho) SELECT id,'carga fictícia','Em Atendimento' FROM pacientes WHERE nome_completo LIKE 'Carga %';`);
    const n = Number(sql('SELECT count(*) FROM fila_pacientes'));
    console.log(`\n## fila com ${n} entradas`);
    for (const ep of ['/fila', '/metricas']) {
      for (let i = 0; i < 10; i++) await req(med, 'GET', ep); // aquecimento (não entra nas estatísticas)
      const seq = []; for (let i = 0; i < 200; i++) { const [t] = await timed(() => req(med, 'GET', ep)); seq.push(t); }
      reg(`fila=${n}`, `GET ${ep}`, 'sequencial', seq);
      const conc = []; let i = 0, erros = 0;
      const inicio = performance.now();
      await Promise.all(Array.from({ length: 10 }, async () => { while (i < 200) { i++; const [t, r] = await timed(() => req(med, 'GET', ep)); conc.push(t); if (r.status !== 200) erros++; } }));
      const vazao = (200 / ((performance.now() - inicio) / 1000)).toFixed(0);
      reg(`fila=${n}`, `GET ${ep}`, 'concorrente(10)', conc, `vazao=${vazao} req/s; respostas!=200=${erros}`);
    }
  }
  sql(`DELETE FROM fila_pacientes; DELETE FROM visitas WHERE motivo_visita='carga fictícia'; DELETE FROM pacientes WHERE nome_completo LIKE 'Carga %';`);
}

if (fase === 'escrita') {
  const rec = await login('RECEPCIONISTA'), enf = await login('ENFERMEIRO');
  sql(`DELETE FROM fila_pacientes;`);
  const suf = String(Date.now()).slice(-6); const pacs = [];
  for (let i = 0; i < 100; i++) { // preparo (não medido)
    const p = (await req(rec, 'POST', '/patients', { nome_completo: `Escrita ${suf}-${i}`, cpf: String(40000000000 + Number(suf) * 100 + i).slice(0, 11), idade: 40, sexo: 'F' })).data;
    pacs.push(p); await req(enf, 'POST', `/sinais/${p.id}`, { frequencia_cardiaca: 76, saturacao_oxigenio: 98, temperatura: 36.6, pressao_arterial: '120/80' });
  }
  const adm = [], ids = [], falhas = { adm: 0, cls: 0 };
  for (const p of pacs) { const [t, r] = await timed(() => req(rec, 'POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: 40, chegada: '03/11/2026, 10:00', status: 'Aguardando Triagem' })); adm.push(t); if (r.status === 201) ids.push(r.data.id); else falhas.adm++; }
  reg('escrita', 'POST /fila', 'sequencial', adm, `respostas!=201=${falhas.adm}`);
  for (const id of ids) await req(enf, 'PUT', `/fila/${id}`, { status: 'Em Triagem (Enfermeiro)' }); // preparo (não medido)
  const cores = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul']; const cls = [];
  for (let i = 0; i < ids.length; i++) { const [t, r] = await timed(() => req(enf, 'PUT', `/fila/${ids[i]}`, { status: 'Aguardando Atendimento', gravidade: cores[i % 5] })); cls.push(t); if (r.status !== 200) falhas.cls++; }
  reg('escrita', 'PUT /fila/:id (classificar cor)', 'sequencial', cls, `respostas!=200=${falhas.cls}`);
  sql(`DELETE FROM fila_pacientes; DELETE FROM pacientes WHERE nome_completo LIKE 'Escrita %';`);
}

if (fase === 'disp') {
  const pidApi = () => execFileSync('powershell', ['-NoProfile', '-Command', "(Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"], { encoding: 'utf8' }).trim();
  const esperar = async (limite = 120000) => { const t0 = performance.now(); while (performance.now() - t0 < limite) { try { const r = await fetch(API + '/health', { signal: AbortSignal.timeout(1500) }); if (r.status === 200) return performance.now() - t0; } catch {} await sleep(500); } return null; };
  const iniciarApi = () => { const c = spawn('node', ['-r', '../evidencias_tcc/mock/mock-groq.cjs', 'dist/main'], { cwd: process.env.API_DIR, detached: true, stdio: 'ignore', env: process.env }); c.unref(); };
  const matarApi = () => { const p = pidApi(); if (p) execFileSync('powershell', ['-NoProfile', '-Command', `Stop-Process -Id ${p} -Force`]); };
  const resultados = { banco: [], api: [], ambos: [] };
  for (const alvo of ['banco', 'api', 'ambos']) {
    for (let i = 1; i <= 5; i++) {
      if (!(await esperar(60000))) { console.log('API não voltou a responder antes da rodada; abortando'); break; }
      const t0 = performance.now();
      if (alvo !== 'api') execFileSync('docker', ['restart', 'healthhub-test-db'], { stdio: 'ignore' });
      if (alvo !== 'banco') { matarApi(); iniciarApi(); }
      const tempo = await esperar(180000);
      resultados[alvo].push(tempo === null ? null : performance.now() - t0);
      console.log(`${alvo} #${i}: ${tempo === null ? 'NÃO VOLTOU em 180 s' : ((performance.now() - t0) / 1000).toFixed(1) + ' s'}`);
      await sleep(3000);
    }
  }
  const csv = ['alvo_reiniciado,repeticao,segundos_ate_health_200', ...Object.entries(resultados).flatMap(([k, v]) => v.map((x, i) => `${k},${i + 1},${x === null ? 'nao_voltou' : (x / 1000).toFixed(1)}`))].join('\n');
  fs.writeFileSync(OUT + 'disponibilidade.csv', csv + '\n'); console.log('\n' + csv);
}

if (linhas.length) {
  const arq = OUT + `desempenho_${fase}.csv`;
  fs.writeFileSync(arq, [cab, ...linhas].join('\n') + '\n'); console.log('\nCSV:', arq);
}
