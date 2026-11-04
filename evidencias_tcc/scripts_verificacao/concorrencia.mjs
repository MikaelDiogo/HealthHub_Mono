// Tarefa 1 — concorrência na admissão. Banco de teste isolado, pacientes fictícios.
// Uso: source /tmp/testenv.sh; node concorrencia.mjs <rótulo> [repetições=1]   (API em http://localhost:3001)
// A) 2 admissões simultâneas de pacientes diferentes: o cliente calcula a senha como o frontend (maior PR-NNN + 1).
// B) 8 admissões simultâneas do MESMO paciente.
const API = process.env.API || 'http://localhost:3001';
const [rotulo = 'teste', reps = '1'] = process.argv.slice(2);
async function req(t, m, p, b) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); const x = await r.text(); let d = null; try { d = x ? JSON.parse(x) : null; } catch { d = x; } return { status: r.status, data: d }; }
const login = async (p) => (await req(null, 'POST', '/login', { email: process.env[`SEED_${p}_EMAIL`], password: process.env[`SEED_${p}_SENHA`] })).data.token;
const rec = await login('RECEPCIONISTA'), med = await login('MEDICO');
const proxima = (fila) => 'PR-' + String(Math.max(0, ...fila.map((f) => /^PR-(\d+)$/.exec(f.senha)?.[1] ?? 0).map(Number)) + 1).padStart(3, '0');
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let n = 0; const suf = String(Date.now()).slice(-6);
const cpf = () => String(50000000000 + Number(suf) * 10 + (++n)).slice(0, 11);
const novo = async (nome) => (await req(rec, 'POST', '/patients', { nome_completo: nome, cpf: cpf(), idade: 40, sexo: 'F' })).data;
const adm = (p, senha) => req(rec, 'POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: 40, senha, chegada: brt(), status: 'Aguardando Triagem' });
const limpar = async (ids) => { for (const id of ids) await req(med, 'DELETE', `/fila/${id}`); };
let dupSenha = 0, dupEntrada = 0, erros5xx = 0;
console.log(`# concorrencia.mjs — rótulo=${rotulo} repetições=${reps} — ${new Date().toISOString()}`);
for (let i = 1; i <= Number(reps); i++) {
  // A
  const fila0 = (await req(med, 'GET', '/fila')).data;
  const [p1, p2] = [await novo(`Conc A1 ${suf}-${i}`), await novo(`Conc A2 ${suf}-${i}`)];
  const senhaCliente = proxima(fila0);
  const [r1, r2] = await Promise.all([adm(p1, senhaCliente), adm(p2, senhaCliente)]);
  const ok = [r1, r2].filter((r) => r.status === 201);
  const senhas = ok.map((r) => r.data.senha);
  const dupA = new Set(senhas).size < senhas.length;
  if (dupA) dupSenha++;
  erros5xx += [r1, r2].filter((r) => r.status >= 500).length;
  console.log(`rep ${i} A: status=[${r1.status},${r2.status}] senhas=[${senhas}] ${dupA ? 'DUPLICADA' : 'distintas'}`);
  await limpar(ok.map((r) => r.data.id));
  // B
  const p = await novo(`Conc B ${suf}-${i}`);
  const rs = await Promise.all(Array.from({ length: 8 }, (_, k) => adm(p, `B-${suf}-${i}-${k}`)));
  const fila = (await req(med, 'GET', '/fila')).data.filter((f) => f.paciente_id === p.id);
  const cont = {}; rs.forEach((r) => { cont[r.status] = (cont[r.status] ?? 0) + 1; });
  if (fila.length > 1) dupEntrada++;
  erros5xx += rs.filter((r) => r.status >= 500).length;
  console.log(`rep ${i} B: respostas=${JSON.stringify(cont)} entradas_na_fila=${fila.length}`);
  await limpar(fila.map((f) => f.id));
}
console.log(`RESUMO ${rotulo}: repetições=${reps}; repetições com senha duplicada=${dupSenha}; repetições com entrada duplicada=${dupEntrada}; respostas 5xx=${erros5xx}`);
process.exit(dupSenha || dupEntrada || erros5xx ? 1 : 0);
