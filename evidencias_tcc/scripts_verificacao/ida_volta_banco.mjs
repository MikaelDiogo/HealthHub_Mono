// Ida e volta pelo banco (rodada 3): registra pela API valores de fronteira, lê de volta e confere o nível.
// Se o tipo da coluna (float) mudar a igualdade exata, o script RELATA o valor lido; não muda coluna nem limiar.
// Uso: source ~/testenv.sh; node ida_volta_banco.mjs   (API em http://localhost:3001; nível calculado pelas funções reais do frontend)
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const R = fileURLToPath(new URL('../../', import.meta.url)).replace(/\\/g, '/');
const OUT = (process.env.EV_DIR || R + 'evidencias_tcc/scripts_verificacao/saida_ida_volta').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const front = await import(pathToFileURL(R + 'HealthHub-Project/src/utils/vitalStatus.ts').href);
const API = 'http://localhost:3001';
const req = async (t, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); const x = await r.text(); let d; try { d = JSON.parse(x); } catch { d = x; } return { status: r.status, data: d }; };
const login = async (p) => (await req(null, 'POST', '/login', { email: process.env[`SEED_${p}_EMAIL`], password: process.env[`SEED_${p}_SENHA`] })).data.token;
const rec = await login('RECEPCIONISTA'); const enf = await login('ENFERMEIRO');
const suf = String(Date.now()).slice(-6);
const p = (await req(rec, 'POST', '/patients', { nome_completo: `FICTÍCIO-IV ${suf}` })).data;
// [campo, valor enviado, função do frontend, esperado digitado da tabela]
const casos = [
  ['temperatura', 37.8, front.tempStatus, 'warning'], ['temperatura', 39.1, front.tempStatus, 'critical'],
  ['saturacao_oxigenio', 92, front.spo2Status, 'warning'], ['saturacao_oxigenio', 94, front.spo2Status, 'warning'], ['saturacao_oxigenio', 95, front.spo2Status, 'normal'],
  ['frequencia_cardiaca', 90, front.fcStatus, 'normal'], ['frequencia_cardiaca', 91, front.fcStatus, 'warning'],
  ['pressao_arterial', '180/80', front.pressaoStatus, 'critical'], ['pressao_arterial', '179/119', front.pressaoStatus, 'warning'], ['pressao_arterial', '90/60', front.pressaoStatus, 'critical'],
];
const linhas = ['campo,enviado,lido_de_volta,igual,nivel_esperado,nivel_obtido,aprovado'];
let ok = 0;
for (const [campo, valor, fn, esperado] of casos) {
  const r = await req(enf, 'POST', `/sinais/${p.id}`, { [campo]: valor });
  const lista = (await req(enf, 'GET', `/patients/${p.id}/vitals`)).data ?? [];
  const ultimo = [...lista].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const lido = ultimo?.[campo];
  const obtido = fn(typeof valor === 'string' ? lido : Number(lido));
  const igual = String(lido) === String(valor);
  const aprovado = r.status < 300 && obtido === esperado;
  if (aprovado) ok++;
  linhas.push(`${campo},${valor},${lido},${igual ? 'sim' : 'NÃO'},${esperado},${obtido},${aprovado ? 'sim' : 'não'}`);
  await new Promise((s) => setTimeout(s, 1100));
}
const txt = linhas.join(String.fromCharCode(10)) + String.fromCharCode(10);
fs.writeFileSync(OUT + 'ida_volta_banco.csv', txt);
console.log(txt); console.log(`${ok}/${casos.length} aprovados`);
