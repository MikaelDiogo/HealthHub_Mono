// Cenários S1–S8 da migração Manchester → classificação de risco. Banco de teste isolado, pacientes FICTÍCIOS.
// Uso: source /tmp/testenv.sh; node cenarios_accr.mjs <s123|s4|s7|s8>   (API em http://localhost:3001)
// Credenciais vêm de SEED_* do ambiente de teste (não são lidas de .env nem impressas).
import fs from 'node:fs';
const API = process.env.API || 'http://localhost:3001';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const fase = process.argv[2];

async function req(token, method, path, body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { status: r.status, data };
}
async function login(papel) {
  const r = await req(null, 'POST', '/login', { email: process.env[`SEED_${papel}_EMAIL`], password: process.env[`SEED_${papel}_SENHA`] });
  if (!r.data?.token) throw new Error(`login ${papel} falhou (${r.status})`);
  return r.data.token;
}
const med = await login('MEDICO'), enf = await login('ENFERMEIRO'), rec = await login('RECEPCIONISTA');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const suf = String(Date.now()).slice(-6); let n = 0;
const cpf = () => String(70000000000 + Number(suf) * 10 + (++n)).slice(0, 11);
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const SV = { frequencia_cardiaca: 76, saturacao_oxigenio: 98, temperatura: 36.6, pressao_arterial: '120/80' };

async function novo(nome) {
  const p = await req(rec, 'POST', '/patients', { nome_completo: nome, cpf: cpf(), idade: 40, sexo: 'F' });
  if (!p.data?.id) throw new Error('paciente: ' + JSON.stringify(p));
  return p.data;
}
async function admitir(p, senha) {
  const f = await req(rec, 'POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, senha, chegada: brt(), status: 'Aguardando Triagem', motivo_visita: 'Texto fictício' });
  if (!f.data?.id) throw new Error('fila: ' + JSON.stringify(f));
  return f.data;
}
async function triarComSinais(p, f) {
  await req(enf, 'POST', `/sinais/${p.id}`, SV);
  await req(enf, 'PUT', `/fila/${f.id}`, { status: 'Em Triagem (Enfermeiro)' });
}
async function classificar(f, cor, status = 'Aguardando Atendimento', justificativa) {
  return req(enf, 'PUT', `/fila/${f.id}`, { status, gravidade: cor, ...(justificativa ? { justificativa } : {}) });
}
const ordem = async () => ((await req(med, 'GET', '/fila')).data ?? []).map((e) => `${e.nome}${e.gravidade ? ` [${e.gravidade}]` : ' [sem cor]'}`);
const escrever = (arq, txt) => fs.writeFileSync(OUT + arq, txt);
const linhas = [];
const L = (s) => { console.log(s); linhas.push(s); };
const confere = (nome, obtido, esperado) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  L(`${ok ? 'OK   ' : 'FALHA'} ${nome}\n   esperado: ${JSON.stringify(esperado)}\n   obtido:   ${JSON.stringify(obtido)}`);
  return ok;
};
L(`# Fase ${fase} — ${new Date().toISOString()} (UTC) — API ${API}`);

if (fase === 's123') {
  const P = {}, F = {};
  for (const [i, cor] of [['P1', 'Verde'], ['P2', 'Vermelho'], ['P3', 'Azul'], ['P4', 'Laranja'], ['P5', 'Amarelo']]) {
    P[i] = await novo(`${i} Fictício S1`); F[i] = await admitir(P[i], `S1-${suf}-${i}`); await sleep(1100);
    await triarComSinais(P[i], F[i]);
  }
  for (const [i, cor] of [['P1', 'Verde'], ['P2', 'Vermelho'], ['P3', 'Azul'], ['P4', 'Laranja'], ['P5', 'Amarelo']]) {
    const r = await classificar(F[i], cor); if (r.status !== 200) L(`aviso: classificar ${i} → ${r.status} ${JSON.stringify(r.data)}`);
  }
  L('\n## S1 — ordenação da fila');
  const o1 = await ordem(); L('fila: ' + o1.join(' | '));
  confere('S1 ordem P2,P4,P5,P1,P3', o1.map((x) => x.split(' ')[0]), ['P2', 'P4', 'P5', 'P1', 'P3']);

  L('\n## S2 — desempate por chegada (sem limpar)');
  for (const i of ['P6', 'P7']) {
    P[i] = await novo(`${i} Fictício S1`); F[i] = await admitir(P[i], `S1-${suf}-${i}`); await sleep(1100);
    await triarComSinais(P[i], F[i]); await classificar(F[i], 'Amarelo');
  }
  const o2 = await ordem(); L('fila: ' + o2.join(' | '));
  confere('S2 Amarelos em ordem de chegada P5,P6,P7', o2.filter((x) => x.includes('[Amarelo]')).map((x) => x.split(' ')[0]), ['P5', 'P6', 'P7']);

  L('\n## S3 — reavaliação (P5 Amarelo → Vermelho)');
  const r = await classificar(F.P5, 'Vermelho', 'Aguardando Atendimento', 'Reavaliação fictícia de teste');
  L(`PUT reclassificar → HTTP ${r.status}`);
  const o3 = await ordem(); L('fila: ' + o3.join(' | '));
  confere('S3 fila P2,P5,P4,P6,P7,P1,P3', o3.map((x) => x.split(' ')[0]), ['P2', 'P5', 'P4', 'P6', 'P7', 'P1', 'P3']);
  const ev = (await req(med, 'GET', `/patients/${P.P5.id}/eventos`)).data ?? [];
  L('eventos de P5 (do mais recente ao mais antigo; campos devolvidos pela API):');
  for (const e of ev) L('  ' + JSON.stringify({ tipo: e.tipo, gravidade: e.gravidade, status_anterior: e.status_anterior, status_novo: e.status_novo, justificativa: e.justificativa, usuario_nome: e.usuario_nome, usuario_role: e.usuario_role, criado_em: e.criado_em }));
  const cls = ev.filter((e) => e.tipo === 'classificado');
  L(`eventos "classificado" de P5: ${cls.length} (cores: ${cls.map((e) => e.gravidade).reverse().join(' → ')})`);
  L('Observação: o evento guarda a cor NOVA, o autor, o horário e a justificativa; a cor anterior aparece como o evento "classificado" anterior da mesma linha do tempo (não há campo próprio "cor_anterior").');
  fs.writeFileSync(OUT + 's123-ids.json', JSON.stringify({ P5: P.P5.id, F5: F.P5.id }));
  escrever('s123-fila.log', linhas.join('\n') + '\n');
}

if (fase === 's4') {
  const p = await novo('P_S4 Fictício'); const f = await admitir(p, `S4-${suf}`);
  await req(enf, 'POST', `/sinais/${p.id}`, SV);
  const r = await req(rec, 'PUT', `/fila/${f.id}`, { status: 'Aguardando Atendimento', gravidade: 'Vermelho' });
  L(`recepcionista PUT /fila/:id com gravidade=Vermelho → HTTP ${r.status}\ncorpo: ${JSON.stringify(r.data)}`);
  const lista = (await req(med, 'GET', '/fila')).data ?? [];
  const gravada = lista.find((e) => e.id === f.id);
  L(`entrada após a tentativa: status=${gravada?.status} gravidade=${JSON.stringify(gravada?.gravidade ?? null)}`);
  const rm = await req(med, 'PUT', `/fila/${f.id}`, { status: 'Aguardando Atendimento', gravidade: 'Vermelho' });
  L(`(extra) médico PUT com gravidade=Vermelho → HTTP ${rm.status}
corpo: ${JSON.stringify(rm.data)}`);
  L('Achado: a recepção é barrada antes, pelo RolesGuard (PUT /fila/:id não lista recepcionista), com a mensagem genérica do guard; a mensagem do serviço aparece para quem passa pelo guard sem ser enfermeiro (médico).');
  confere('S4 (extra) médico: mensagem do serviço', rm.data?.error, 'Apenas o enfermeiro pode atribuir a categoria de risco.');
  confere('S4 HTTP 403', r.status, 403);
  confere('S4 mensagem real', r.data?.error, 'Apenas o enfermeiro pode atribuir a categoria de risco.');
  confere('S4 nenhuma cor gravada', gravada?.gravidade ?? null, null);
  escrever('s4-api-403.log', linhas.join('\n') + '\n');
}

if (fase === 's8') {
  const p = await novo('P8 Fictício'); const f = await admitir(p, `S8-${suf}`);
  L(`P8 admitido com status "${f.status}"`);
  const r = await req(enf, 'PUT', `/fila/${f.id}`, { status: 'Em Observação' });
  L(`enfermeiro PUT status "Aguardando Triagem" → "Em Observação" (salto) → HTTP ${r.status}\ncorpo: ${JSON.stringify(r.data)}`);
  const lista = (await req(med, 'GET', '/fila')).data ?? [];
  L(`status depois da tentativa: ${lista.find((e) => e.id === f.id)?.status}`);
  const r2 = await req(med, 'PUT', `/fila/${f.id}`, { status: 'Aguardando Triagem' });
  L(`(extra) médico volta para "Aguardando Triagem" → HTTP ${r2.status}`);
  escrever('s8-bruto.log', linhas.join('\n') + '\n');
}

if (fase === 's7') {
  const p = await novo('P7 Fictício'); const f = await admitir(p, `S7-${suf}`);
  L(`admissão (recepção) → entrada ${f.id ? 'criada' : 'FALHOU'}, status "${f.status}"`);
  const sv = await req(enf, 'POST', `/sinais/${p.id}`, { ...SV, saturacao_oxigenio: 88, frequencia_cardiaca: 130 });
  L(`sinais vitais (enfermeiro) → HTTP ${sv.status}`);
  const cur = await req(enf, 'GET', `/sinais/${p.id}/vitals`); L(`última leitura → HTTP ${cur.status} ${JSON.stringify(cur.data)?.slice(0, 160)}`);
  const sem = await req(enf, 'PUT', `/fila/${f.id}`, { status: 'Em Triagem (Enfermeiro)' });
  const ia = await req(med, 'POST', `/patients/${p.id}/chat`, { message: 'Pergunta fictícia de teste', patientContext: { nome: 'P7 Fictício', idade: 40, sexo: 'F' }, history: [] });
  L(`chat de IA (provedor simulado) → HTTP ${ia.status}; resposta: ${JSON.stringify(ia.data)?.slice(0, 160)}`);
  const lista = (await req(med, 'GET', '/fila')).data ?? [];
  const e = lista.find((x) => x.id === f.id);
  L(`gravidade após usar a IA: ${JSON.stringify(e?.gravidade ?? null)} (esperado null: a IA não atribui cor)`);
  const altaEnf = await req(enf, 'PATCH', `/fila/${f.id}/alta`); L(`alta por enfermeiro → HTTP ${altaEnf.status}`);
  const altaMed = await req(med, 'PATCH', `/fila/${f.id}/alta`); L(`alta por médico → HTTP ${altaMed.status}`);
  escrever('s7-bruto.log', linhas.join('\n') + '\n');
}
