// E2E das rotas de rastreabilidade (fila_eventos) contra o banco de teste isolado. Só dados fictícios.
// Uso: API=http://localhost:3011 node e2e_eventos.mjs  (credenciais vêm das variáveis SEED_* do ambiente de teste)
const API = process.env.API || 'http://localhost:3011';
const out = [];
const log = (nome, ok, extra) => { out.push({ nome, ok, ...extra }); console.log(ok ? 'OK  ' : 'FALHA', nome, extra ? JSON.stringify(extra) : ''); };

async function req(token, method, path, body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, data };
}
async function login(papel) {
  const email = process.env[`SEED_${papel}_EMAIL`], senha = process.env[`SEED_${papel}_SENHA`];
  const r = await req(null, 'POST', '/login', { email, password: senha });
  const t = r.data?.token;
  if (!t) throw new Error(`login ${papel} falhou (${r.status})`);
  return t;
}
const sufixo = String(Date.now()).slice(-6);
const cpf = (n) => String(90000000000 + Number(sufixo) * 10 + n).slice(0, 11);

const med = await login('MEDICO'), enf = await login('ENFERMEIRO'), rec = await login('RECEPCIONISTA');

async function novoPaciente(nome, n) {
  const r = await req(rec, 'POST', '/patients', { nome_completo: nome, cpf: cpf(n), idade: 45, sexo: 'F', telefone: '11900000000' });
  if (!r.data?.id) throw new Error('paciente: ' + JSON.stringify(r));
  return r.data.id;
}
async function admitir(pid, senha) {
  const r = await req(rec, 'POST', '/fila', { paciente_id: pid, nome: 'Paciente Fictício', idade: 45, senha, chegada: '10:00', status: 'Aguardando Triagem', motivo_visita: 'Dor de cabeça (texto fictício)' });
  return r.data;
}

// Paciente A: fluxo completo
const pa = await novoPaciente('Paciente Teste Alfa', 1);
const fa = await admitir(pa, `E2E-${sufixo}-A`);
log('admissão (recepção) cria fila', !!fa?.id, { status: fa?.status });
const sv = await req(enf, 'POST', `/sinais/${pa}`, { frequencia_cardiaca: 80, saturacao_oxigenio: 97, temperatura: 36.6, pressao_arterial: '120/80' });
log('sinais vitais (enfermeiro)', sv.status === 201, { status: sv.status });
const t1 = await req(enf, 'PUT', `/fila/${fa.id}`, { status: 'Em Triagem (Enfermeiro)' });
log('iniciar triagem', t1.status === 200, { status: t1.status });
const t2 = await req(enf, 'PUT', `/fila/${fa.id}`, { status: 'Aguardando Atendimento', gravidade: 'Amarelo', justificativa: 'Justificativa fictícia de teste' });
log('classificar cor com justificativa', t2.status === 200, { status: t2.status });
const t3 = await req(med, 'PUT', `/fila/${fa.id}`, { status: 'Em Consulta (Médico)' });
log('consulta iniciada (médico)', t3.status === 200, { status: t3.status });

// Enfermeiro não pode dar alta via PUT; não deve gerar evento
const antes = (await req(med, 'GET', `/patients/${pa}/eventos`)).data?.length;
const tNeg = await req(enf, 'PUT', `/fila/${fa.id}`, { status: 'Alta' });
const depoisNeg = (await req(med, 'GET', `/patients/${pa}/eventos`)).data?.length;
log('enfermeiro PUT Alta → 403 e nenhum evento novo', tNeg.status === 403 && antes === depoisNeg, { status: tNeg.status, antes, depois: depoisNeg });

const alta = await req(med, 'PATCH', `/fila/${fa.id}/alta`);
log('alta (médico) via PATCH', alta.status === 200 || alta.status === 204, { status: alta.status });

const evA = await req(med, 'GET', `/patients/${pa}/eventos`);
const tipos = (evA.data ?? []).map((e) => e.tipo).reverse();
log('eventos do paciente A na ordem esperada', JSON.stringify(tipos) === JSON.stringify(['admitido', 'sinais_registrados', 'triagem_iniciada', 'classificado', 'consulta_iniciada', 'alta']), { tipos });
const cl = (evA.data ?? []).find((e) => e.tipo === 'classificado');
log('classificação traz cor, justificativa, autor (nome+perfil) e data ISO', cl?.gravidade === 'Amarelo' && cl?.justificativa?.startsWith('Justificativa') && cl?.usuario_role === 'enfermeiro' && !!cl?.usuario_nome && !Number.isNaN(Date.parse(cl?.criado_em)), { gravidade: cl?.gravidade, role: cl?.usuario_role, tem_nome: !!cl?.usuario_nome, criado_em: cl?.criado_em });

// Paciente B: classificado e depois removido (DELETE) → histórico preserva a cor
const pb = await novoPaciente('Paciente Teste Beta', 2);
const fb = await admitir(pb, `E2E-${sufixo}-B`);
await req(enf, 'POST', `/sinais/${pb}`, { frequencia_cardiaca: 90 });
await req(enf, 'PUT', `/fila/${fb.id}`, { status: 'Aguardando Atendimento', gravidade: 'Verde' });
const del = await req(med, 'DELETE', `/fila/${fb.id}`);
const evB = await req(med, 'GET', `/patients/${pb}/eventos`);
const tb = (evB.data ?? []).map((e) => e.tipo);
log('removido da esteira registra evento e preserva a cor', del.status < 300 && tb.includes('removido_da_fila') && (evB.data ?? []).some((e) => e.tipo === 'classificado' && e.gravidade === 'Verde'), { delete_status: del.status, tipos: tb });

// Permissões da rota
const r403 = await req(rec, 'GET', `/patients/${pa}/eventos`);
log('recepção lendo eventos → 403', r403.status === 403, { status: r403.status });
const r401 = await req(null, 'GET', `/patients/${pa}/eventos`);
log('sem login → 401', r401.status === 401, { status: r401.status });
const rEnf = await req(enf, 'GET', `/patients/${pa}/eventos`);
log('enfermeiro lendo eventos → 200', rEnf.status === 200, { status: rEnf.status });

// Justificativa acima do limite e gravidade inválida
const vJ = await req(enf, 'PUT', `/fila/${fa.id}`, { justificativa: 'x'.repeat(501) });
log('justificativa > 500 caracteres → 400', vJ.status === 400, { status: vJ.status });

console.log('\nRESUMO', out.filter((o) => o.ok).length + '/' + out.length);
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../logs/e2e_eventos_resultado.json', import.meta.url), JSON.stringify({ api: API, executado_em: new Date().toISOString(), resultados: out }, null, 2));
process.exit(out.every((o) => o.ok) ? 0 : 1);
