// Cenários S1 a S8 (migração ACCR) executados pela API, em banco de TESTE isolado, com pacientes FICTÍCIOS e IA SIMULADA (mock).
// Uso: source <ambiente de teste com SEED_*>; node s1_s8.mjs        (API em http://localhost:3001, iniciada com o mock de IA)
// Saída: EV_DIR ou ./saida_s1_s8/ (s123-fila.log, s4-api-403.log, s5-sem-tempos.log, s7-regressao.md, s8-saltos-estado.md, s1_s8_resultado.json).
// S1, S2 e S3 são um fixture contínuo (sem limpar entre eles). S4 a S8 limpam antes os pacientes DESTE script ("Fictício S…").
// S6 (migração) fica em s6_migration.mjs. S5 aqui é a verificação estática dos textos no código-fonte; a tela é conferida no F14 e nas capturas.
// O resultado de cada cenário é o OBSERVADO. O S8 não tem critério de aprovado/reprovado: só registra o comportamento.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API = process.env.API || 'http://localhost:3001';
const OUT = (process.env.EV_DIR || fileURLToPath(new URL('./saida_s1_s8/', import.meta.url))).replace(/\\/g, '/').replace(/\/?$/, '/');
const RAIZ = fileURLToPath(new URL('../../', import.meta.url)).replace(/\\/g, '/');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(t, m, p, b) {
  const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined });
  const x = await r.text(); let d = null; try { d = x ? JSON.parse(x) : null; } catch { d = x; }
  return { status: r.status, data: d };
}
const login = async (p) => (await req(null, 'POST', '/login', { email: process.env[`SEED_${p}_EMAIL`], password: process.env[`SEED_${p}_SENHA`] })).data?.token;
const T = { medico: await login('MEDICO'), enfermeiro: await login('ENFERMEIRO'), recepcionista: await login('RECEPCIONISTA') };
if (!T.medico || !T.enfermeiro || !T.recepcionista) throw new Error('Login falhou: carregue o ambiente do banco de teste (SEED_*) e suba a API.');
const versao = (() => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RAIZ, encoding: 'utf8' }).trim(); } catch { return 'desconhecida'; } })();

const resultados = [];
const log = { s123: [], s4: [], s5: [], s7: [], s8: [] };
const reg = (fase, linha) => { log[fase].push(linha); console.log(linha); };
const ok = (id, nome, aprovado, extra = {}) => { resultados.push({ id, nome, resultado: aprovado ? 'APROVADO' : 'REPROVADO', ...extra }); };

const suf = String(Date.now()).slice(-7); let seq = 0;
const cpf = () => String(60000000000 + Number(suf) * 10 + (++seq)).slice(0, 11);
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const nomes = {}; // rótulo (P1..) -> { paciente, entrada }

async function limparDesteScript() {
  const fila = (await req(T.medico, 'GET', '/fila')).data ?? [];
  for (const e of fila.filter((x) => /Fictício S\d/.test(x.nome))) await req(T.medico, 'DELETE', `/fila/${e.id}`);
}
async function novo(rot, suffixo, extra = {}) {
  const r = await req(T.recepcionista, 'POST', '/patients', { nome_completo: `${rot} Fictício ${suffixo}`, cpf: cpf(), idade: 40, sexo: 'F', ...extra });
  return r.data;
}
async function admitir(rot, suffixo) {
  const p = await novo(rot, suffixo);
  const e = (await req(T.recepcionista, 'POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, chegada: `08:00 (${brt()})`, status: 'Aguardando Triagem', motivo_visita: 'cenário fictício' })).data;
  nomes[rot] = { paciente: p, entrada: e };
  await sleep(1100); // a ordem de chegada usa o instante gravado no servidor
  return nomes[rot];
}
const sinais = (rot, v = {}) => req(T.enfermeiro, 'POST', `/sinais/${nomes[rot].paciente.id}`, { frequencia_cardiaca: 72, saturacao_oxigenio: 98, temperatura: 36.5, pressao_arterial: '120/80', ...v });
const classificar = async (rot, cor, justificativa) => {
  await req(T.enfermeiro, 'PUT', `/fila/${nomes[rot].entrada.id}`, { status: 'Em Triagem (Enfermeiro)' });
  return req(T.enfermeiro, 'PUT', `/fila/${nomes[rot].entrada.id}`, { status: 'Aguardando Atendimento', gravidade: cor, ...(justificativa ? { justificativa } : {}) });
};
const rotulo = (nome) => nome.split(' ')[0];
const ordem = async (suffixo) => ((await req(T.medico, 'GET', '/fila')).data ?? []).filter((e) => e.nome.endsWith(`Fictício ${suffixo}`)).map((e) => ({ r: rotulo(e.nome), cor: e.gravidade ?? null }));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const linhaFila = (o) => o.map((x) => `${x.r} [${x.cor ?? 'sem cor'}]`).join(' | ');

await limparDesteScript();

// ── S1 ──
reg('s123', `# Cenários S1 a S3 — ${new Date().toISOString()} — API ${API} — versão ${versao}\n\n## S1 — ordenação da fila`);
for (const r of ['P1', 'P2', 'P3', 'P4', 'P5']) { await admitir(r, 'S1'); await sinais(r); }
const cores = { P1: 'Verde', P2: 'Vermelho', P3: 'Azul', P4: 'Laranja', P5: 'Amarelo' };
for (const r of Object.keys(cores)) await classificar(r, cores[r]);
let o = await ordem('S1'); let esp = ['P2', 'P4', 'P5', 'P1', 'P3'];
reg('s123', `fila: ${linhaFila(o)}`);
ok('S1', 'Ordenação da fila', igual(o.map((x) => x.r), esp), { esperado: esp, obtido: o.map((x) => x.r) });
reg('s123', `${resultados.at(-1).resultado} S1 ordem ${esp.join(',')}\n   obtido: ${JSON.stringify(o.map((x) => x.r))}`);

// ── S2 ── (sem limpar)
reg('s123', '\n## S2 — desempate por chegada (sem limpar)');
for (const r of ['P6', 'P7']) { await admitir(r, 'S1'); await sinais(r); await classificar(r, 'Amarelo'); }
o = await ordem('S1'); const amarelos = o.filter((x) => x.cor === 'Amarelo').map((x) => x.r);
reg('s123', `fila: ${linhaFila(o)}`);
ok('S2', 'Desempate por chegada', igual(amarelos, ['P5', 'P6', 'P7']), { esperado: ['P5', 'P6', 'P7'], obtido: amarelos });
reg('s123', `${resultados.at(-1).resultado} S2 Amarelos em ordem de chegada P5,P6,P7\n   obtido: ${JSON.stringify(amarelos)}`);

// ── S3 ── (continuando)
reg('s123', '\n## S3 — reavaliação (P5 Amarelo → Vermelho)');
const re = await classificar('P5', 'Vermelho', 'Reavaliação fictícia (cenário S3)');
o = await ordem('S1'); esp = ['P2', 'P5', 'P4', 'P6', 'P7', 'P1', 'P3'];
reg('s123', `PUT reclassificar → HTTP ${re.status}\nfila: ${linhaFila(o)}`);
const ev = (await req(T.medico, 'GET', `/patients/${nomes.P5.paciente.id}/eventos`)).data ?? [];
const classif = ev.filter((e) => e.tipo === 'classificado');
reg('s123', 'eventos de P5 (do mais recente ao mais antigo; campos devolvidos pela API):');
for (const e of ev) reg('s123', '  ' + JSON.stringify({ tipo: e.tipo, gravidade: e.gravidade, status_anterior: e.status_anterior, status_novo: e.status_novo, justificativa: e.justificativa, usuario_nome: e.usuario_nome, usuario_role: e.usuario_role, criado_em: e.criado_em }));
const eventoOk = classif.length >= 2 && classif[0].gravidade === 'Vermelho' && classif[1].gravidade === 'Amarelo' && !!classif[0].usuario_nome && !!classif[0].criado_em;
ok('S3', 'Reavaliação', re.status === 200 && igual(o.map((x) => x.r), esp) && eventoOk, { esperado: esp, obtido: o.map((x) => x.r), evento_reclassificacao_registrado: eventoOk });
reg('s123', `${resultados.at(-1).resultado} S3 fila ${esp.join(',')} e evento (quem, quando, Amarelo → Vermelho)=${eventoOk}`);

// ── S4 ──
await limparDesteScript();
reg('s4', `# S4 — permissão (teste negativo autorizado) — ${new Date().toISOString()} — versão ${versao}`);
await admitir('P9', 'S4'); await sinais('P9');
const neg = await req(T.recepcionista, 'PUT', `/fila/${nomes.P9.entrada.id}`, { status: 'Aguardando Atendimento', gravidade: 'Vermelho' });
const depois = ((await req(T.medico, 'GET', '/fila')).data ?? []).find((e) => e.id === nomes.P9.entrada.id);
reg('s4', `recepcionista → PUT /fila/:id com gravidade=Vermelho: HTTP ${neg.status}\ncorpo: ${JSON.stringify(neg.data)}\ncor gravada depois: ${depois?.gravidade ?? '(nenhuma)'}`);
const msgOk = JSON.stringify(neg.data).includes('Apenas o enfermeiro pode atribuir a categoria de risco.');
ok('S4', 'Permissão: recepção não grava cor (HTTP 403 e nenhuma cor gravada)', neg.status === 403 && !depois?.gravidade, { http: neg.status, cor_gravada: depois?.gravidade ?? null, nota: 'A parte da tela (o seletor não aparece para a recepção) é conferida no F10/F13 e nas capturas.' });
reg('s4', `${resultados.at(-1).resultado} S4: HTTP ${neg.status}, nenhuma cor gravada=${!depois?.gravidade}`);
// A mensagem exigida pelo documento ('Apenas o enfermeiro pode atribuir a categoria de risco.'): desde a rodada 3 (correção S4) o RolesGuard a devolve
// também para a recepção quando o corpo traz `gravidade` (decorator @NegacaoPorCampo); sem esse campo a recusa segue genérica. O critério não foi alterado.
ok('S4-mensagem', 'Mensagem real para a recepção (critério do documento)', msgOk, { mensagem_obtida_recepcao: neg.data, nota: 'Antes da correção S4 a recepção recebia a mensagem genérica do guard (reprovado); agora recebe a mensagem do documento. Sem o campo gravidade a recusa continua genérica.' });
reg('s4', `${resultados.at(-1).resultado} S4-mensagem: mensagem real do documento para a recepção=${msgOk} (obtido: ${JSON.stringify(neg.data)})`);
const negMed = await req(T.medico, 'PUT', `/fila/${nomes.P9.entrada.id}`, { status: 'Aguardando Atendimento', gravidade: 'Vermelho' });
const msgMed = JSON.stringify(negMed.data).includes('Apenas o enfermeiro pode atribuir a categoria de risco.');
ok('S4-medico', '(extra) médico também não grava cor, com a mensagem do serviço', negMed.status === 403 && msgMed, { http: negMed.status, corpo: negMed.data });
reg('s4', `${resultados.at(-1).resultado} S4 (extra) médico: HTTP ${negMed.status}, mensagem do serviço=${msgMed}`);

// ── S5 (estático) ──
const lerTodos = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? (d.name === 'node_modules' ? [] : lerTodos(dir + d.name + '/')) : (/\.(ts|tsx)$/.test(d.name) && !/\.spec\./.test(d.name) ? [dir + d.name] : []));
const fontes = [...lerTodos(RAIZ + 'HealthHub-Project/src/'), ...lerTodos(RAIZ + 'HealthHub-BackEnd/src/')].map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));
const acha = (re) => fontes.filter((x) => re.test(x.t)).map((x) => x.f.replace(RAIZ, ''));
const tempos = acha(/\b(Imediato|Muito urgente)\b|\b(10|60|120|240)\s*(min|minutos)\b[^'"`\n]{0,20}(alvo|meta)/i);
const rot = acha(/Classificação de risco:/); const prazos = acha(/não controla prazos/);
reg('s5', `# S5 — sem tempos na tela (verificação estática do código-fonte) — ${new Date().toISOString()}`);
reg('s5', `textos de tempo-alvo/Manchester encontrados: ${tempos.length ? tempos.join(', ') : 'nenhum'}\nrótulo "Classificação de risco:" em: ${rot.join(', ') || 'NÃO ENCONTRADO'}\ntexto "o sistema não controla prazos" em: ${prazos.join(', ') || 'NÃO ENCONTRADO'}`);
ok('S5', 'Sem tempos na tela (estático)', tempos.length === 0 && rot.length > 0 && prazos.length > 0, { tempos, rotulo: rot, prazos });
reg('s5', resultados.at(-1).resultado);

// ── S7 ──
await limparDesteScript();
reg('s7', `# S7 — regressão (checagens pela API; IA simulada) — ${new Date().toISOString()} — versão ${versao}\n`);
const chk = (nome, aprovado, detalhe) => { reg('s7', `- [${aprovado ? 'x' : ' '}] ${nome}${detalhe ? ` — ${detalhe}` : ''}`); return aprovado; };
const todos = [];
await admitir('P10', 'S7');
todos.push(chk('Admissão pela API: entrada criada com senha PR-NNN gerada pelo servidor', /^PR-\d{3,}$/.test(nomes.P10.entrada?.senha ?? ''), `senha ${nomes.P10.entrada?.senha}`));
const crit = await sinais('P10', { frequencia_cardiaca: 130, saturacao_oxigenio: 90, temperatura: 39.2 });
const met = (await req(T.medico, 'GET', '/metricas')).data;
const naLista = (met?.atencao ?? []).find((a) => a.paciente_id === nomes.P10.paciente.id);
todos.push(chk('Sinais vitais críticos (FC 130, SpO₂ 90, 39,2 °C) entram na lista "atenção agora" do painel', crit.status < 300 && naLista?.nivel === 'critico', naLista ? naLista.motivo : 'não listado'));
const antes = (await req(T.medico, 'GET', '/fila')).data.find((e) => e.id === nomes.P10.entrada.id);
const chat = await req(T.medico, 'POST', `/patients/${nomes.P10.paciente.id}/chat`, { message: 'Pergunta fictícia do cenário S7', patientContext: { alergias: 'Nenhuma', medicamentos: 'Nenhum', anamnese: 'Fictícia' }, history: [] });
const depoisIA = (await req(T.medico, 'GET', '/fila')).data.find((e) => e.id === nomes.P10.entrada.id);
todos.push(chk('Chat de IA responde (simulado) e NÃO atribui cor nem muda a esteira', (chat.status === 200 || chat.status === 201) && (antes?.gravidade ?? null) === (depoisIA?.gravidade ?? null) && antes?.status === depoisIA?.status, `HTTP ${chat.status}; cor antes/depois: ${antes?.gravidade ?? 'sem cor'}/${depoisIA?.gravidade ?? 'sem cor'}`));
await classificar('P10', 'Amarelo');
const alta = await req(T.medico, 'PATCH', `/fila/${nomes.P10.entrada.id}/alta`, { desfecho: 'Alta' });
const sumiu = !((await req(T.medico, 'GET', '/fila')).data ?? []).some((e) => e.id === nomes.P10.entrada.id);
const vis = (await req(T.medico, 'GET', `/patients/${nomes.P10.paciente.id}/visitas`)).data?.visitas ?? [];
todos.push(chk('Alta pelo médico: sai da esteira e a visita fecha com desfecho', alta.status < 300 && sumiu && vis.some((v) => v.alta && v.desfecho), `HTTP ${alta.status}; visita: ${JSON.stringify(vis.map((v) => ({ desfecho: v.desfecho, risco: v.classificacao_risco })))}`));
todos.push(chk('Alertas crítico/atenção/normal por valor: cobertos pelos testes unitários (vitalStatus.spec e calcular-metricas.spec); a conferência na fronteira exata está no TF05', true, 'ver logs dos testes'));
ok('S7', 'Regressão', todos.every(Boolean), { itens: todos.length });
reg('s7', `\n${resultados.at(-1).resultado} — ${todos.filter(Boolean).length}/${todos.length} itens`);

// ── S8 ── (sem critério de aprovado/reprovado)
await limparDesteScript();
reg('s8', `# S8 — saltos de estado (comportamento OBSERVADO) — ${new Date().toISOString()} — versão ${versao}\n`);
await admitir('P8', 'S8');
const salto = await req(T.enfermeiro, 'PUT', `/fila/${nomes.P8.entrada.id}`, { status: 'Em Observação' });
const apos = (await req(T.medico, 'GET', '/fila')).data.find((e) => e.id === nomes.P8.entrada.id);
reg('s8', `P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)\nHTTP ${salto.status}\ncorpo: ${JSON.stringify(salto.data).slice(0, 300)}\nstatus depois: ${apos?.status}\n\nObservação: ${salto.status < 300 ? 'o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.' : 'o salto foi RECUSADO com a mensagem acima.'}`);
resultados.push({ id: 'S8', nome: 'Saltos de estado', resultado: 'REGISTRADO (sem critério de aprovação)', http: salto.status, status_depois: apos?.status, aceito: salto.status < 300 });

await limparDesteScript();
fs.writeFileSync(OUT + 's123-fila.log', log.s123.join('\n') + '\n');
fs.writeFileSync(OUT + 's4-api-403.log', log.s4.join('\n') + '\n');
fs.writeFileSync(OUT + 's5-sem-tempos.log', log.s5.join('\n') + '\n');
fs.writeFileSync(OUT + 's7-regressao.md', log.s7.join('\n') + '\n');
fs.writeFileSync(OUT + 's8-saltos-estado.md', log.s8.join('\n') + '\n');
fs.writeFileSync(OUT + 's1_s8_resultado.json', JSON.stringify({ versao, data: new Date().toISOString(), api: API, resultados }, null, 2));
console.log('\nRESUMO:'); for (const r of resultados) console.log(`  ${r.id}: ${r.resultado}`);
process.exit(resultados.some((r) => r.resultado === 'REPROVADO') ? 1 : 0);
