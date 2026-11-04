// Casos TF01–TF08 do Apêndice A (Quadro 16), executados contra a API local, banco de teste isolado, dados FICTÍCIOS, IA simulada (mock).
// Uso: source /tmp/testenv_tf.sh; VERSAO=<hash> node tf_casos.mjs   (API em http://localhost:3001 iniciada com o mock de IA)
// O resultado de cada caso é o OBSERVADO; "aprovado" só quando coincide com o critério esperado do Apêndice. Nada é preenchido à mão.
import fs from 'node:fs';
const API = 'http://localhost:3001';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(t, m, p, b) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }); const x = await r.text(); let d = null; try { d = x ? JSON.parse(x) : null; } catch { d = x; } return { status: r.status, data: d }; }
const login = async (p) => (await req(null, 'POST', '/login', { email: process.env[`SEED_${p}_EMAIL`], password: process.env[`SEED_${p}_SENHA`] })).data.token;
const T = { medico: await login('MEDICO'), enfermeiro: await login('ENFERMEIRO'), recepcionista: await login('RECEPCIONISTA') };

// casos fictícios (os mesmos do ensaio cronometrado)
const csv = fs.readFileSync(OUT + '../casos_ficticios.csv', 'utf8').trim().split(/\r?\n/);
const cab = csv[0].split(',');
const casos = csv.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [cab[i], v])));
const nCaso = (n) => casos[n - 1];

const resultados = [];
const registrar = (id, regra, entrada, esperado, obtido, resultado, extra = {}) => { resultados.push({ id, regra, entrada, esperado, obtido, resultado, ...extra }); console.log(`[${id}] ${resultado} — ${String(obtido).slice(0, 170)}`); };
const SV = (c) => ({ frequencia_cardiaca: Number(c.frequencia_cardiaca), saturacao_oxigenio: Number(c.saturacao_oxigenio), temperatura: Number(c.temperatura), pressao_arterial: c.pressao_arterial });
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const cadastrar = async (c) => (await req(T.recepcionista, 'POST', '/patients', { nome_completo: c.nome, cpf: c.cpf_ficticio, idade: Number(c.idade), sexo: c.sexo, telefone: '11900000000' })).data;
const admitir = async (p, c) => (await req(T.recepcionista, 'POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, chegada: `${c.chegada} (${brt()})`, status: 'Aguardando Triagem', motivo_visita: c.motivo_visita })).data;
const ordem = async () => ((await req(T.medico, 'GET', '/fila')).data ?? []).map((e) => `${e.nome}${e.gravidade ? `[${e.gravidade}]` : '[sem cor]'}`);

// TF01 — Cadastro / RF02 (cadastro mínimo: só o nome é obrigatório)
const P = {}, F = {};
{
  const c = nCaso(1);
  const r = await req(T.recepcionista, 'POST', '/patients', { nome_completo: c.nome }); const p = r.data; P[1] = p;
  const lido = (await req(T.medico, 'GET', '/patients/' + p?.id)).data;
  const igual = r.status === 201 && lido?.id === p.id && lido?.nome_completo === c.nome && lido?.nome_provisorio === false && lido?.cpf == null && lido?.idade == null && lido?.sexo == null;
  registrar('TF01', 'Cadastro / RF02', 'Cadastrar ' + c.nome + ' só com o nome (dados mínimos)', 'Salvar e recuperar o registro com o nome e sem trocar a identidade; CPF, idade e sexo ausentes (null)', 'status=' + r.status + '; id criado=' + p?.id + '; id lido=' + lido?.id + '; nome igual=' + (lido?.nome_completo === c.nome) + '; cpf/idade/sexo=' + [lido?.cpf, lido?.idade, lido?.sexo].map((x) => x ?? 'null').join('/'), igual ? 'APROVADO' : 'REPROVADO');
}

// TF02 / TF03 — Classificação e desempate / RF09
for (let i = 2; i <= 5; i++) P[i] = await cadastrar(nCaso(i));
for (let i = 1; i <= 5; i++) { F[i] = await admitir(P[i], nCaso(i)); await sleep(1100); }
// não triado, registrado separadamente
const pNT = await cadastrar({ nome: 'FICTÍCIO-06', cpf_ficticio: '90000000006', idade: '30', sexo: 'F' }); const fNT = await admitir(pNT, { chegada: '08:25', motivo_visita: 'sem triagem (fictício)' });
for (let i = 1; i <= 5; i++) {
  const c = nCaso(i);
  await req(T.enfermeiro, 'POST', `/sinais/${P[i].id}`, SV(c));
  await req(T.enfermeiro, 'PUT', `/fila/${F[i].id}`, { status: 'Em Triagem (Enfermeiro)' });
  await req(T.enfermeiro, 'PUT', `/fila/${F[i].id}`, { status: 'Aguardando Atendimento', gravidade: c.categoria_artificial });
}
const o = await ordem(); const classificados = o.filter((x) => !x.includes('[sem cor]')).map((x) => x.split('[')[0]);
const esperadoOrdem = ['FICTÍCIO-03', 'FICTÍCIO-01', 'FICTÍCIO-02', 'FICTÍCIO-04', 'FICTÍCIO-05'];
registrar('TF02', 'Classificação de risco / RF09', 'Inserir os cinco registros de fila (amarelo×2, laranja, verde, azul) e classificá-los', 'Entre classificados: Laranja, Amarelo, Amarelo, Verde, Azul (não há Vermelho no roteiro). Não triados: registrar separadamente', `fila: ${o.join(' | ')}`, JSON.stringify(classificados) === JSON.stringify(esperadoOrdem) ? 'APROVADO' : 'REPROVADO', { observacao: `Não triado (FICTÍCIO-06): posição ${o.findIndex((x) => x.startsWith('FICTÍCIO-06')) + 1} de ${o.length} (observado; é ordem a revisar, não regra clínica aprovada). Obs.: a ordem de chegada usa o instante de gravação no servidor, não o texto do horário informado no campo "chegada".` });
const i1 = classificados.indexOf('FICTÍCIO-01'), i2 = classificados.indexOf('FICTÍCIO-02');
registrar('TF03', 'Desempate / RF09', 'Comparar os dois registros amarelos (chegadas 08:00 e 08:05)', 'FICTÍCIO-01 antes de FICTÍCIO-02', `posições: FICTÍCIO-01=${i1 + 1}, FICTÍCIO-02=${i2 + 1}`, i1 >= 0 && i1 < i2 ? 'APROVADO' : 'REPROVADO');

// TF04 — Pré-condição / RF11
{
  const c = { nome: 'FICTÍCIO-07', cpf_ficticio: '90000000007', idade: '40', sexo: 'M', chegada: '08:30', motivo_visita: 'sem sinais (fictício)' };
  const p = await cadastrar(c); const f = await admitir(p, c);
  await req(T.enfermeiro, 'PUT', `/fila/${f.id}`, { status: 'Em Triagem (Enfermeiro)' });
  const r = await req(T.enfermeiro, 'PUT', `/fila/${f.id}`, { status: 'Aguardando Atendimento', gravidade: 'Verde' });
  const depois = ((await req(T.medico, 'GET', '/fila')).data ?? []).find((e) => e.id === f.id);
  registrar('TF04', 'Pré-condição / RF11', 'Tentar registrar a categoria antes de salvar sinais vitais', 'Bloquear a classificação (regra 4.1.1)', `HTTP ${r.status} ${JSON.stringify(r.data)}; gravidade gravada=${JSON.stringify(depois?.gravidade ?? null)}`, r.status === 400 && !depois?.gravidade ? 'APROVADO' : 'REPROVADO');
}

// TF06 — Estados / RF10/RF12 (fluxo e transição não prevista)
{
  const c = { nome: 'FICTÍCIO-08', cpf_ficticio: '90000000008', idade: '35', sexo: 'F', chegada: '08:35', motivo_visita: 'fluxo (fictício)' };
  const p = await cadastrar(c); const f = await admitir(p, c); const log = [];
  const passo = async (papel, status, extra = {}) => { const r = await req(T[papel], 'PUT', `/fila/${f.id}`, { status, ...extra }); log.push(`${papel}→"${status}": HTTP ${r.status}`); return r; };
  await req(T.enfermeiro, 'POST', `/sinais/${p.id}`, SV(nCaso(1)));
  await passo('enfermeiro', 'Em Triagem (Enfermeiro)'); await passo('enfermeiro', 'Aguardando Atendimento', { gravidade: 'Amarelo' }); await passo('medico', 'Em Consulta (Médico)'); await passo('medico', 'Em Observação');
  const alta = await req(T.medico, 'PATCH', `/fila/${f.id}/alta`); log.push(`médico alta: HTTP ${alta.status}`);
  const c2 = { nome: 'FICTÍCIO-09', cpf_ficticio: '90000000009', idade: '29', sexo: 'M', chegada: '08:40', motivo_visita: 'salto (fictício)' };
  const p2 = await cadastrar(c2); const f2 = await admitir(p2, c2);
  const salto1 = await req(T.medico, 'PUT', `/fila/${f2.id}`, { status: 'Em Consulta (Médico)' });
  const salto2 = await req(T.enfermeiro, 'PUT', `/fila/${f2.id}`, { status: 'Em Observação' });
  const volta = await req(T.medico, 'PUT', `/fila/${f2.id}`, { status: 'Aguardando Triagem' });
  registrar('TF06', 'Estados / RF10/RF12', 'Percorrer o fluxo de estados e tentar transições não previstas', 'Documentar o backend atual (sem validação de transições); sem inventar bloqueio existente', `Fluxo: ${log.join('; ')}. Saltos: "Aguardando Triagem"→"Em Consulta (Médico)" HTTP ${salto1.status}; →"Em Observação" HTTP ${salto2.status}; retroceder→"Aguardando Triagem" HTTP ${volta.status}`, [salto1.status, salto2.status, volta.status].every((s) => s === 200) ? 'DOCUMENTADO (saltos e retrocesso ACEITOS; sem validação de transição)' : 'DOCUMENTADO (alguma transição foi recusada; ver obtido)', { observacao: 'Sem critério de aprovado/reprovado: registra o comportamento atual (ver fila-valores.ts). A matriz de transições aprovada não existe; teste de correção futuro fica pendente.' });
}

// TF07 — Acesso / RNF04 (matriz observada: perfis × operações)
{
  const pm = (await cadastrar({ nome: 'FICTÍCIO-10', cpf_ficticio: '90000000010', idade: '50', sexo: 'F' })); const fm = await admitir(pm, { chegada: '08:45', motivo_visita: 'matriz (fictício)' });
  await req(T.enfermeiro, 'POST', `/sinais/${pm.id}`, SV(nCaso(1)));
  const ops = [
    ['GET /fila', (t) => req(t, 'GET', '/fila')],
    ['POST /patients (cadastrar)', (t) => req(t, 'POST', '/patients', { nome_completo: 'FICTÍCIO-11', cpf: String(91000000000 + Math.floor(Math.random() * 1e6)), idade: 30, sexo: 'F' })],
    ['GET /patients', (t) => req(t, 'GET', '/patients')],
    ['POST /sinais/:id', (t) => req(t, 'POST', `/sinais/${pm.id}`, { frequencia_cardiaca: 80 })],
    ['GET /patients/:id/vitals', (t) => req(t, 'GET', `/patients/${pm.id}/vitals`)],
    ['PUT /fila/:id (iniciar triagem)', (t) => req(t, 'PUT', `/fila/${fm.id}`, { status: 'Em Triagem (Enfermeiro)' })],
    ['PUT /fila/:id (classificar cor)', (t) => req(t, 'PUT', `/fila/${fm.id}`, { status: 'Aguardando Atendimento', gravidade: 'Verde' })],
    ['PUT /fila/:id (status Alta)', (t) => req(t, 'PUT', `/fila/${fm.id}`, { status: 'Alta' })],
    ['GET /patients/:id/eventos', (t) => req(t, 'GET', `/patients/${pm.id}/eventos`)],
    ['POST /patients/:id/chat (IA)', (t) => req(t, 'POST', `/patients/${pm.id}/chat`, { message: 'Pergunta fictícia', patientContext: { alergias: 'x' }, history: [] })],
    ['GET /metricas', (t) => req(t, 'GET', '/metricas')],
    ['PATCH /patients/:id/visitas/fechar', (t) => req(t, 'PATCH', `/patients/${pm.id}/visitas/fechar`, { desfecho: 'Alta' })],
    ['PATCH /fila/:id/alta', (t) => req(t, 'PATCH', `/fila/${fm.id}/alta`)],
    ['DELETE /fila/:id', (t) => req(t, 'DELETE', `/fila/${fm.id}`)],
  ];
  const linhas = ['| Operação | recepcionista | enfermeiro | médico |', '|---|---|---|---|']; const matriz = {};
  for (const [nome, fn] of ops) { const cel = []; for (const papel of ['recepcionista', 'enfermeiro', 'medico']) { const r = await fn(T[papel]); cel.push(r.status); } matriz[nome] = cel; linhas.push(`| ${nome} | ${cel.join(' | ')} |`); }
  const semAuth = await req(null, 'GET', '/fila');
  fs.writeFileSync(OUT + 'tf07_matriz_perfis.md', `# TF07 — matriz OBSERVADA de acesso (código HTTP por perfil)\n\nObservada, não aprovada: a matriz de perfis "ainda a documentar" (Apêndice A). 403 = recusado pelo perfil; 2xx = aceito; 4xx/5xx diferentes de 403 podem ser regra de negócio ou dado (a operação passou pela checagem de perfil). Sem login: GET /fila → ${semAuth.status}.\nAs operações rodam em sequência no mesmo paciente fictício, então alguns 400/404/409 refletem o estado deixado pelas anteriores.\n\n${linhas.join('\n')}\n`);
  const sem403 = Object.entries(matriz).filter(([, c]) => c.some((s) => s === 403)).length;
  registrar('TF07', 'Acesso / RNF04', 'Contas fictícias de perfis distintos executando as operações do sistema', 'Permitir só as operações autorizadas na matriz de perfis (ainda a documentar)', `matriz observada em tf07_matriz_perfis.md (${ops.length} operações; ${sem403} com ao menos um 403); sem login → ${semAuth.status}`, 'OBSERVADO (sem matriz aprovada para comparar; ver arquivo)', { matriz });
}

// TF08 — Falha de integração / RF16/RF17 (provedor de IA simulado indisponível)
{
  const c = nCaso(1); const idp = P[1].id;
  await req(T.enfermeiro, 'POST', `/sinais/${idp}`, SV(c));
  const antes = (await req(T.medico, 'GET', `/patients/${idp}/vitals`)).data?.length;
  const testes = {};
  for (const gat of ['__ERRO_429__', '__ERRO_500__', '__TIMEOUT__', '__VAZIO__']) { const r = await req(T.medico, 'POST', `/patients/${idp}/chat`, { message: gat, patientContext: { alergias: 'x' }, history: [] }); testes[gat] = { http: r.status, corpo: JSON.stringify(r.data).slice(0, 140) }; }
  const depois = (await req(T.medico, 'GET', `/patients/${idp}/vitals`)).data?.length;
  const semResposta = Object.values(testes).every((t) => !/SIMULADA — NÃO/.test(t.corpo));
  registrar('TF08', 'Falha de integração / RF16/RF17', 'Provedor de IA simulado indisponível (429, 500, timeout, resposta vazia)', 'Exibir a falha sem inventar resposta clínica nem perder o registro local', `${JSON.stringify(testes)}; sinais vitais registrados antes=${antes}, depois=${depois}`, semResposta && antes === depois ? 'APROVADO (nível API; a mensagem na tela está em tf08_ui.md)' : 'REPROVADO', { observacao: 'Em 429 e 500 o backend devolve HTTP 500 com mensagem genérica (o 429 vira 500). Nenhuma resposta clínica foi inventada.', testes });
}

fs.writeFileSync(OUT + 'tf_resultados.json', JSON.stringify({ versao: process.env.VERSAO, data: new Date().toISOString(), executor: 'Claude Code (automação) a pedido do autor', ambiente: 'API local, banco de teste isolado, IA simulada', resultados }, null, 2));
console.log('\nresumo:', resultados.map((r) => `${r.id}=${r.resultado.split(' ')[0]}`).join(' '));
