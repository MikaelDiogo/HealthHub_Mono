// Rodada 5b (pedido 7, Passo 4): chamadas reais à Groq, Figura 26 (chat com a linha CID-10: e o bloco de conferência) e Figura 26c (SIMULADA).
// Dois modos, por variável de ambiente:
//  MODO=real (padrão)  API SEM mock, subida com `node -r registro_groq.cjs dist/main` e a chave SÓ no processo da API (este script nunca a lê nem a grava).
//                      ETAPA=2A|2B (só rotula o resultado), N_CHAMADAS (padrão 3). Chamada 1 = pela TELA (captura 1280 x 800); as demais = pelo endpoint, com o
//                      MESMO corpo que a tela envia agora: history vazio na primeira pergunta (a saudação inicial não entra mais no history).
//                      Intervalo mínimo de 22 s entre chamadas reais (inclusive entre execuções: lê o horário da última entrada do registro).
//                      Limite TOTAL de 6 chamadas reais: conta as entradas do jsonl GROQ_REGISTRO e recusa passar disso. Use o MESMO GROQ_REGISTRO nas etapas 2A e 2B.
//                      Para parar na 1ª falha: se a Groq responder erro (429 ou outro), grava o que há e SAI sem repetir.
//                      REPETIR_TELA=1: faz UMA nova chamada pela tela (conta no limite de 6), para o caso de a chamada 1 pela tela não ter bloco mas outra ter.
//  MODO=simulado       API COM o mock (evidencias_tcc/mock/mock-groq.cjs): nenhuma chamada real. Envia __CID__ pela tela e captura a Figura 26c, rotulada SIMULADO.
// Variáveis: CDP_LIB, EV_DIR, COMMIT, SEED_MEDICO_EMAIL/SENHA, SEED_ENFERMEIRO_EMAIL/SENHA; no modo real também GROQ_REGISTRO e DIST_BACKEND (pasta HealthHub-BackEnd com dist/).
// Uso: source <ambiente de teste>; CDP_LIB=... EV_DIR=... COMMIT=... GROQ_REGISTRO=... DIST_BACKEND=... ETAPA=2A node capturas_rodada5b.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const { Browser, sleep } = await import(pathToFileURL(process.env.CDP_LIB).href);
const OUT = (process.env.EV_DIR || './saida_rodada5b').replace(/\\/g, '/').replace(/\/?$/, '/'); fs.mkdirSync(OUT, { recursive: true });
const COMMIT = process.env.COMMIT || 'desconhecido';
const MODO = process.env.MODO || 'real';
const ETAPA = process.env.ETAPA || '2A';
const REPETIR_TELA = process.env.REPETIR_TELA === '1';
const N_PEDIDAS = REPETIR_TELA ? 1 : Math.max(1, Number(process.env.N_CHAMADAS || 3));
const INTERVALO_MS = 22000; const LIMITE_TOTAL = 6;
const NL = String.fromCharCode(10);
const API = 'http://localhost:3001';
const PERGUNTA = 'Quais os diagnósticos diferenciais mais prováveis, os sinais de alerta a pesquisar e a conduta inicial? Sugira o CID provável.';

const login = async (e, s) => (await (await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: s }) })).json());
const api = async (tok, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: b ? JSON.stringify(b) : undefined }); let d = null; try { d = await r.json(); } catch {} return { status: r.status, data: d }; };
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const manifesto = [];
const COLUNAS = ['arquivo', 'figura', 'tela', 'perfil', 'paciente', 'data_hora', 'commit', 'resultado', 'observacoes'];
const gravarManifesto = (nome) => fs.writeFileSync(OUT + nome, [COLUNAS.join(','), ...manifesto.map((m) => COLUNAS.map((c) => csvCell(m[c])).join(','))].join(NL) + NL);

const lg = await login(process.env.SEED_MEDICO_EMAIL, process.env.SEED_MEDICO_SENHA);
const enf = await login(process.env.SEED_ENFERMEIRO_EMAIL, process.env.SEED_ENFERMEIRO_SENHA);
const sufixo = String(Date.now()).slice(-6);

// ── navegador: sessão do médico no Monitoramento, paciente selecionado ──
async function abrirMonitor(nomePaciente) {
  const b = await Browser.launch({ width: 1280, height: 800 });
  const pg = await b.newPage({ width: 1280, height: 800, reducedMotion: true });
  await pg.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome)});localStorage.setItem('healthhub_termos_aceitos_v1.0','true');}catch(e){}` });
  await pg.goto('http://localhost:5173/main/monitor', { settleMs: 3000 });
  await pg.eval(() => document.querySelector('input[placeholder="Selecionar..."]')?.focus());
  await pg.send('Input.insertText', { text: nomePaciente }); await sleep(1200);
  const sel = await pg.eval(() => { const o = document.querySelector('[role=option]'); if (o) { o.click(); return true; } return false; });
  await sleep(2500);
  return { b, pg, sel };
}
const texto = (pg) => pg.eval(() => document.body.innerText);
const enviarPelaTela = async (pg, msg) => {
  await pg.eval(() => document.querySelector('input[placeholder="Mensagem ou use o microfone..."]')?.focus());
  await pg.send('Input.insertText', { text: msg });
  await pg.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await pg.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
};
const rolar = (pg, fim) => pg.eval((fim) => { const els = [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible'); els.forEach((e) => (e.scrollTop = fim ? e.scrollHeight : 0)); }, fim).then(() => sleep(800));
// O cabeçalho do bloco está dentro da área visível do chat (e da janela)?
const blocoVisivel = (pg) => pg.eval(() => {
  const el = [...document.querySelectorAll('p')].find((e) => e.textContent.trim().startsWith('Conferência na CID-10'));
  if (!el) return false;
  const r = el.getBoundingClientRect(); let a = el.parentElement;
  while (a && !(a.scrollHeight > a.clientHeight + 40 && getComputedStyle(a).overflowY !== 'visible')) a = a.parentElement;
  const lim = a ? a.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
  return r.top >= Math.max(0, lim.top) && r.bottom <= Math.min(window.innerHeight, lim.bottom);
});

// ════════════════════════ MODO SIMULADO (Figura 26c) ════════════════════════
if (MODO === 'simulado') {
  const nome = 'FICTÍCIO-07';
  const p = (await api(lg.token, 'POST', '/patients', { nome_completo: `${nome} ${sufixo}`, cpf: String(31000000000 + Number(sufixo)).slice(0, 11), idade: 40, sexo: 'F', alergias: 'Nenhuma (fictício)', anamnese: 'Caso fictício para a figura simulada.' })).data;
  await api(enf.token, 'POST', `/sinais/${p.id}`, { frequencia_cardiaca: 76, saturacao_oxigenio: 98, temperatura: 36.6, pressao_arterial: '120/80' });
  const { b, pg, sel } = await abrirMonitor(nome);
  await enviarPelaTela(pg, '__CID__');
  let resp = '';
  for (let i = 0; i < 30; i++) { await sleep(1500); resp = await texto(pg); if (resp.includes('Conferência na CID-10')) break; }
  await sleep(1200); resp = await texto(pg);
  const confere = { paciente_selecionado: sel, cabecalho: resp.includes('Conferência na CID-10 (DATASUS, versão 2008):'), I10: /I10 – [^\n]*consta na tabela/.test(resp), I21: /I21 – [^\n]*consta como categoria/.test(resp), U071: /U07\.1 – não consta na tabela CID-10 do DATASUS/.test(resp) };
  const ok = Object.values(confere).every(Boolean);
  const obs = `SIMULADO: resposta fabricada pelo mock (nenhuma chamada real à Groq); código que consta (I10), categoria (I21) e código que não consta na tabela de 2008 (U07.1). Conferido na tela: ${JSON.stringify(confere)}`;
  await rolar(pg, false);
  await pg.screenshot({ path: OUT + 'fig26c_bloco_simulado_r5b.png', format: 'png' });
  const visivelNoTopo = await blocoVisivel(pg);
  manifesto.push({ arquivo: 'fig26c_bloco_simulado_r5b.png', figura: '26c (extra)', tela: 'Chat de IA com resposta SIMULADA contendo a linha CID-10: e o bloco de conferência (consta, categoria, não consta)', perfil: 'Médico', paciente: `${nome} ${sufixo}`, data_hora: agora(), commit: COMMIT, resultado: ok ? 'OK' : 'FALHA', observacoes: obs + `. Bloco visível no recorte do topo: ${visivelNoTopo}` });
  if (!visivelNoTopo) {
    await rolar(pg, true);
    await pg.screenshot({ path: OUT + 'fig26c_bloco_simulado_r5b_fim.png', format: 'png' });
    manifesto.push({ arquivo: 'fig26c_bloco_simulado_r5b_fim.png', figura: '26c (extra, parte 2)', tela: 'Mesma resposta SIMULADA, rolada até o fim: bloco de conferência', perfil: 'Médico', paciente: `${nome} ${sufixo}`, data_hora: agora(), commit: COMMIT, resultado: ok && (await blocoVisivel(pg)) ? 'OK' : 'FALHA', observacoes: 'SIMULADO: o bloco não coube no recorte do topo; só a rolagem do chat muda' });
  }
  await b.close();
  gravarManifesto('figuras_manifesto_5b_simulado.csv');
  console.log(`26c simulada: ${ok ? 'OK' : 'FALHA'} ${JSON.stringify(confere)}`);
  process.exit(ok ? 0 : 1);
}

// ════════════════════════ MODO REAL ════════════════════════
const REG = process.env.GROQ_REGISTRO; const DIST = process.env.DIST_BACKEND;
if (!REG || !DIST) throw new Error('Defina GROQ_REGISTRO (jsonl do registro_groq.cjs) e DIST_BACKEND (pasta HealthHub-BackEnd com dist/).');
const req = createRequire(import.meta.url);
const { Cid10Service } = req(DIST + '/dist/modules/ai/application/cid10.service.js');
const { extrairCodigos, posicaoLinhaCid, formatarCodigoOficial, CABECALHO_CONFERENCIA } = req(DIST + '/dist/modules/ai/application/cid10-extracao.js');
const cid = new Cid10Service();
const registros = () => (fs.existsSync(REG) ? fs.readFileSync(REG, 'utf8').split(NL).filter(Boolean).map((l) => JSON.parse(l)) : []);
const simplificar = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const NOME = 'FICTÍCIO-06'; const NOME_COMPLETO = `${NOME} ${sufixo}`;
const dados = { alergias: 'Dipirona (fictício)', medicamentos_em_uso: 'Nenhum (fictício)', anamnese: 'Dor lombar há 2 dias após esforço, sem febre (texto fictício).' };
const p = (await api(lg.token, 'POST', '/patients', { nome_completo: NOME_COMPLETO, cpf: String(30000000000 + Number(sufixo)).slice(0, 11), idade: 40, sexo: 'F', ...dados })).data;
const sinais = { frequencia_cardiaca: 76, saturacao_oxigenio: 98, temperatura: 36.6, pressao_arterial: '120/80' };
await api(enf.token, 'POST', `/sinais/${p.id}`, sinais);

const usadasAntes = registros().length;
const podeFazer = Math.max(0, Math.min(N_PEDIDAS, LIMITE_TOTAL - usadasAntes));
console.log(`etapa ${ETAPA}: chamadas reais já registradas=${usadasAntes}; pedidas=${N_PEDIDAS}; permitidas agora=${podeFazer} (limite total ${LIMITE_TOTAL})`);
if (podeFazer === 0) { console.log('Limite total de 6 chamadas reais atingido: nada a fazer.'); fs.writeFileSync(OUT + 'chamadas_reais_5b.json', JSON.stringify({ commit: COMMIT, etapa: ETAPA, recusado: 'limite total de 6 chamadas reais', chamadas_ja_registradas: usadasAntes, chamadas: [] }, null, 1)); process.exit(0); }

// espera o intervalo mínimo desde a última chamada registrada (vale também entre execuções)
async function esperarIntervalo() {
  const r = registros(); if (!r.length) return;
  const falta = INTERVALO_MS - (Date.now() - new Date(r.at(-1).quando).getTime());
  if (falta > 0) { console.log(`aguardando ${(falta / 1000).toFixed(0)} s (intervalo mínimo de 22 s)`); await sleep(falta); }
}

// análise de UMA chamada, a partir da entrada do registro (o que a Groq devolveu) e do que o cliente recebeu
function analisar(n, via, reg, ms, replyFinal, blocoNaTela) {
  const base = { chamada: n, etapa: ETAPA, via, http_groq: reg?.http ?? null, tempo_total_ms: ms };
  if (!reg || reg.erro) return { ...base, erro: reg?.erro ? `Groq respondeu HTTP ${reg.http}` : 'sem entrada no registro' };
  const original = reg.content ?? ''; const pos = posicaoLinhaCid(original); const codigos = extrairCodigos(original);
  const msgs = reg.mensagens_enviadas || []; const porPapel = {}; msgs.forEach((m) => { porPapel[m.role] = (porPapel[m.role] || 0) + 1; });
  const nomeNorm = simplificar(NOME_COMPLETO);
  const blocoNoCliente = via === 'api' ? !!replyFinal && replyFinal.includes(CABECALHO_CONFERENCIA) : blocoNaTela;
  return { ...base, finish_reason: reg.finish_reason ?? null, completion_tokens: reg.completion_tokens ?? null, reasoning_tokens: reg.reasoning_tokens ?? null, max_tokens_enviado: reg.max_tokens_enviado ?? null,
    chars_resposta_modelo: original.length, posicao_linha_CID10: pos, na_primeira_linha: pos === 1, codigos_extraidos: codigos,
    conferencia: codigos.map((c) => { const r = cid.conferir(c); return { codigo_oficial: formatarCodigoOficial(r.codigo), situacao: r.situacao, descricao_oficial: r.descricao }; }),
    resposta_final_tem_bloco: blocoNoCliente,
    verificacao_do_nome: { nome_do_paciente_enviado_a_groq: msgs.some((m) => simplificar(m.content ?? '').includes(nomeNorm)), mensagens_verificadas: msgs.length, mensagens_verificadas_por_papel: porPapel } };
}

const chamadas = []; let parou = null;
for (let i = 1; i <= podeFazer; i++) {
  await esperarIntervalo();
  const antes = registros().length;
  const pelaTela = i === 1; // chamada 1 pela tela; as demais pelo endpoint
  if (pelaTela) {
    const { b, pg, sel } = await abrirMonitor(NOME);
    const tamPergunta = (await texto(pg)).length; const t0 = Date.now(); let tFim = null; let resp = '';
    await enviarPelaTela(pg, PERGUNTA);
    for (let k = 0; k < 70; k++) {
      await sleep(1500); const regs = registros();
      if (regs.length > antes && regs.at(-1).erro) break;
      resp = await texto(pg);
      if (regs.length > antes && !resp.includes('•••') && resp.length > tamPergunta + 200) { tFim = Date.now(); break; }
    }
    const ms = (tFim ?? Date.now()) - t0; // do envio até a resposta aparecer (resolução ~1,5 s)
    await sleep(800); resp = await texto(pg);
    const reg = registros().slice(antes)[0];
    console.log(`chamada ${i} (tela): paciente selecionado=${sel}; ${(ms / 1000).toFixed(1)} s; HTTP Groq=${reg?.http}`);
    const blocoNaTela = resp.includes(CABECALHO_CONFERENCIA);
    const an = analisar(i, 'tela', reg, ms, null, blocoNaTela); chamadas.push(an);
    if (reg?.erro) { parou = `Groq respondeu HTTP ${reg.http} na chamada ${i}; parei, sem repetir`; await b.close(); break; }
    const suf = REPETIR_TELA ? '_repeticao' : '';
    const linhaVisivel = an.na_primeira_linha;
    const ok = blocoNaTela && an.posicao_linha_CID10 !== null;
    await rolar(pg, false);
    await pg.screenshot({ path: OUT + `fig26_chat_ia_cid_conferencia_r5b${suf}.png`, format: 'png' });
    manifesto.push({ arquivo: `fig26_chat_ia_cid_conferencia_r5b${suf}.png`, figura: '26', tela: 'Chat de IA com a resposta REAL da Groq (prompt novo): topo, com a linha CID-10: (mesmo recorte da captura original)', perfil: 'Médico', paciente: NOME_COMPLETO, data_hora: agora(), commit: COMMIT, resultado: ok ? 'OK' : 'FALHA',
      observacoes: `Provedor REAL (Groq), etapa ${ETAPA}. Linha CID-10: na posição ${an.posicao_linha_CID10 ?? 'nenhuma'} (primeira linha: ${linhaVisivel}); bloco de conferência na tela: ${blocoNaTela}; finish_reason ${an.finish_reason}; ${(ms / 1000).toFixed(1)} s. ${ok ? '' : 'NÃO ATENDIDA: sem linha CID-10: e/ou sem bloco nesta resposta; não foi forjado.'}` });
    await rolar(pg, true);
    await pg.screenshot({ path: OUT + `fig26b_chat_ia_cid_bloco_conferencia_r5b${suf}.png`, format: 'png' });
    const blocoVisFim = blocoNaTela && (await blocoVisivel(pg));
    manifesto.push({ arquivo: `fig26b_chat_ia_cid_bloco_conferencia_r5b${suf}.png`, figura: '26 (parte 2)', tela: 'Mesma resposta, rolada até o FIM: bloco "Conferência na CID-10 (DATASUS, versão 2008)"', perfil: 'Médico', paciente: NOME_COMPLETO, data_hora: agora(), commit: COMMIT, resultado: blocoVisFim ? 'OK' : 'FALHA',
      observacoes: `Mesmo recorte 1280 x 800; só a rolagem do chat muda (recorte vertical: fim da resposta). Bloco visível: ${blocoVisFim}. ${blocoNaTela ? '' : 'NÃO ATENDIDA: não há bloco nesta resposta real; não foi forjado.'}` });
    await b.close();
  } else {
    // mesmo corpo que a tela envia agora: history vazio na 1ª pergunta (a saudação inicial não entra mais no history)
    const corpo = { message: PERGUNTA, patientContext: { alergias: dados.alergias, medicamentos: dados.medicamentos_em_uso, anamnese: dados.anamnese, sinaisVitais: sinais }, history: [] };
    const t0 = Date.now(); const r = await api(lg.token, 'POST', `/patients/${p.id}/chat`, corpo); const ms = Date.now() - t0;
    const reg = registros().slice(antes)[0];
    console.log(`chamada ${i} (API): HTTP ${r.status}; ${(ms / 1000).toFixed(1)} s; HTTP Groq=${reg?.http}`);
    if (r.status !== 200 && r.status !== 201) { chamadas.push({ chamada: i, etapa: ETAPA, via: 'api', http_api: r.status, http_groq: reg?.http ?? null, tempo_total_ms: ms, corpo_resposta: JSON.stringify(r.data).slice(0, 160) }); parou = `API respondeu HTTP ${r.status} na chamada ${i}; parei, sem repetir`; break; }
    chamadas.push({ ...analisar(i, 'api', reg, ms, r.data?.reply ?? '', null), http_api: r.status, chars_resposta_final: (r.data?.reply ?? '').length });
  }
}

// resumo do critério (2 de 3: linha CID-10: nas primeiras linhas E bloco gerado)
const comLinha = chamadas.filter((c) => c.posicao_linha_CID10 !== null && c.posicao_linha_CID10 <= 3).length;
const comBloco = chamadas.filter((c) => c.posicao_linha_CID10 !== null && c.resposta_final_tem_bloco).length;
const telaTemBloco = !!chamadas.find((c) => c.via === 'tela')?.resposta_final_tem_bloco;
const outraTemBloco = chamadas.some((c) => c.via === 'api' && c.resposta_final_tem_bloco);
const sugestao = !telaTemBloco && outraTemBloco && !REPETIR_TELA ? 'A chamada pela tela NÃO teve bloco, mas outra teve: se ainda houver chamadas no limite de 6, rode de novo com REPETIR_TELA=1 (1 chamada pela tela).' : null;
const resumo = { commit: COMMIT, etapa: ETAPA, pergunta: PERGUNTA, paciente: `${NOME} (fictício)`, chamadas_ja_registradas_antes: usadasAntes, limite_total: LIMITE_TOTAL, parou, criterio: { chamadas_com_linha_CID10_nas_primeiras_3_linhas: comLinha, chamadas_com_linha_e_bloco: comBloco, de: chamadas.length, atingido_2_de_3: comBloco >= 2 }, sugestao, chamadas };
fs.writeFileSync(OUT + (REPETIR_TELA ? 'chamadas_reais_5b_repeticao_tela.json' : `chamadas_reais_5b${ETAPA === '2A' ? '' : '_' + ETAPA}.json`), JSON.stringify(resumo, null, 1));
gravarManifesto(REPETIR_TELA ? 'figuras_manifesto_5b_repeticao.csv' : `figuras_manifesto_5b${ETAPA === '2A' ? '' : '_' + ETAPA}.csv`);
console.log(JSON.stringify({ etapa: ETAPA, parou, criterio: resumo.criterio, sugestao, chamadas: chamadas.map((c) => ({ n: c.chamada, via: c.via, finish: c.finish_reason, ms: c.tempo_total_ms, pos: c.posicao_linha_CID10, codigos: c.codigos_extraidos, bloco: c.resposta_final_tem_bloco, nome_enviado: c.verificacao_do_nome?.nome_do_paciente_enviado_a_groq })) }));
