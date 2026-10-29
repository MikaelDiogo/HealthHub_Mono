// B4 — unicidade da senha e concorrência no POST /fila (banco de teste isolado, dados fictícios).
// Só MEDE; não corrige. Uso: SAIDA=arquivo.json node b4_concorrencia.mjs  (variáveis SEED_* no ambiente)
import fs from 'node:fs';
const API = 'http://localhost:3001';
const login = async (email, password) => (await (await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()).token;
const tok = await login(process.env.SEED_RECEPCIONISTA_EMAIL, process.env.SEED_RECEPCIONISTA_SENHA);
const med = await login(process.env.SEED_MEDICO_EMAIL, process.env.SEED_MEDICO_SENHA);
const H = (t) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + t });
const sufixo = Date.now().toString().slice(-6);
const novoPaciente = async (nome, cpf) => (await (await fetch(API + '/patients', { method: 'POST', headers: H(tok), body: JSON.stringify({ nome_completo: nome, cpf, idade: 30, sexo: 'F' }) })).json());
const admitir = (p, senha) => fetch(API + '/fila', { method: 'POST', headers: H(tok), body: JSON.stringify({ paciente_id: p.id, nome: p.nome_completo, idade: 30, senha, chegada: '29/10/2026, 15:00', status: 'Aguardando Triagem' }) }).then(async (r) => ({ status: r.status, corpo: await r.json().catch(() => null) }));
const fila = async () => (await (await fetch(API + '/fila', { headers: H(med) })).json());

const r = {};
// 1) Dois pacientes diferentes, MESMA senha, ao mesmo tempo
const a = await novoPaciente('TESTE K — Senha ' + sufixo, '99' + sufixo + '001');
const b = await novoPaciente('TESTE L — Senha ' + sufixo, '99' + sufixo + '002');
const [ra, rb] = await Promise.all([admitir(a, 'PR-900'), admitir(b, 'PR-900')]);
const f1 = (await fila()).filter((x) => x.senha === 'PR-900');
r.senha_repetida = { respostas: [ra.status, rb.status], entradas_com_a_mesma_senha: f1.length };

// 2) O MESMO paciente admitido 8 vezes ao mesmo tempo (corrida entre "ler" e "inserir")
const c = await novoPaciente('TESTE M — Corrida ' + sufixo, '99' + sufixo + '003');
const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => admitir(c, 'PR-91' + i)));
const f2 = (await fila()).filter((x) => x.paciente_id === c.id);
r.mesmo_paciente_8_posts_simultaneos = { respostas: rs.map((x) => x.status), entradas_na_fila_para_o_paciente: f2.length, senhas: f2.map((x) => x.senha) };

fs.writeFileSync(process.env.SAIDA, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
