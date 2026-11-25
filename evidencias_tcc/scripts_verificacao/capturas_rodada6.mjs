// Rodada 6 (textos legais alinhados ao código): conferência automática + capturas, a partir do clone limpo do commit X. Banco de TESTE isolado, dados FICTÍCIOS, IA SIMULADA.
// Só os TEXTOS mudaram; nenhuma chamada à Groq é feita por este script.
// O que faz:
//   1) abre o modal de termos pela tela (médico, primeiro acesso) e lê o texto inteiro do modal (T);
//   2) abre /main/politica e lê o texto da página (P);
//   3) clica em "Baixar PDF", pega o PDF gerado e extrai o texto inteiro com pdftotext (F);
//   4) confere automaticamente o Passo 1 do PEDIDO_CLAUDE_8.md nos três textos (frases ANTIGAS ausentes e frases NOVAS presentes) e grava
//      conferencia_textos.json, conferencia_textos.md e os três textos brutos (texto_modal_termos.txt, texto_politica_pagina.txt, texto_pdf_politica.txt);
//   5) captura 1280 x 800, tema claro, PNG: fig29_termos_ia_r6.png (mesmo recorte da fig29 da rodada 4), fig30_politica_pdf_pag1_r6.png (1ª página do PDF)
//      e extras de conferência visual (modal_seguranca_r6, modal_direitos_contato_r6, modal_contato_r6, politica_pagina_seguranca_r6).
// A comparação ignora acentos, caixa e quebras de linha (o PDF é gerado sem acentos e o pdftotext quebra linhas). Um FALHA em frase que atravessa a quebra de
// uma caixa do PDF deve ser conferido olhando a captura.
// Uso: source <ambiente do banco de teste>; CDP_LIB=<cdp.mjs> EV_DIR=<pasta> COMMIT=<hash> node capturas_rodada6.mjs   (API em :3001 e Vite em :5173 de pé)
// Variáveis: SEED_MEDICO_EMAIL e SEED_MEDICO_SENHA (como nos outros scripts); PDFTOTEXT (opcional, caminho do pdftotext).
// Uma captura ou conferência que falha NÃO é ocultada: entra no manifesto/na tabela como FALHA e o resto continua. Código de saída 1 se alguma conferência falhar.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pagina, ir, passo, sleep, texto, fechar, abrir } from './cenarios22/lib.mjs';

const OUT = (process.env.EV_DIR || './saida_rodada6').replace(/\\/g, '/').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const COMMIT = process.env.COMMIT || 'desconhecido';
const VP = { width: 1280, height: 800 };
const PDFS = OUT + 'pdfs_gerados/'; fs.mkdirSync(PDFS, { recursive: true });

const manifesto = [];
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
async function foto(page, arquivo, meta) {
  await sleep(600);
  await page.screenshot({ path: OUT + arquivo, format: 'png' });
  manifesto.push({ arquivo, ...meta, data_hora: agora(), commit: COMMIT, resultado: 'OK' });
  console.log('✓', arquivo);
}
const tente = async (nome, fn) => { try { await fn(); } catch (e) { manifesto.push({ arquivo: `(FALHA) ${nome}`, observacoes: String(e.message).slice(0, 240), data_hora: agora(), commit: COMMIT, resultado: 'FALHA' }); console.log('✗', nome, e.message); } };
// Primeira página de um PDF como PNG: abre o arquivo no visualizador do navegador e recorta só a folha (sem a barra do visualizador).
async function pdfParaPng(pdfAbs, arquivo, meta) {
  const pg = await b.newPage({ ...VP, reducedMotion: true });
  const url = 'file:///' + pdfAbs.replace(/\\/g, '/').split('/').map((x, i) => (i === 0 ? x : encodeURIComponent(x))).join('/');
  // #toolbar=0&navpanes=0&view=Fit: esconde a barra do visualizador e encaixa a primeira página inteira na janela
  await pg.goto(url + '#toolbar=0&navpanes=0&scrollbar=0&view=Fit&page=1', { settleMs: 5000 });
  await pg.screenshot({ path: OUT + arquivo, format: 'png' });
  manifesto.push({ arquivo, ...meta, data_hora: agora(), commit: COMMIT, resultado: 'OK' });
  console.log('✓', arquivo);
  await pg.close();
}
// pdftotext: tenta o caminho informado, o do PATH e o do Git Bash (mingw64). Devolve '' se nenhum funcionar.
function pdfParaTexto(pdfAbs, extra = []) {
  const candidatos = [process.env.PDFTOTEXT, 'pdftotext', '/mingw64/bin/pdftotext'].filter(Boolean);
  for (const exe of candidatos) {
    const r = spawnSync(exe, ['-enc', 'UTF-8', ...extra, pdfAbs, '-'], { encoding: 'utf8' });
    if (!r.error && r.stdout) return r.stdout;
  }
  return '';
}

// ── conferência automática do Passo 1 (T = Termos/modal, P = Política/página, F = PDF) ──
// Os padrões estão na forma NORMALIZADA (sem acentos, minúsculas, espaços únicos). `alvos` diz em quais textos o item vale.
const TODOS = ['T', 'P', 'F'];
const ITENS = [
  // frases ANTIGAS: não podem aparecer
  { id: 'A1', tipo: 'ausente', rotulo: 'Zod', re: '\\bzod\\b', alvos: TODOS },
  { id: 'A2', tipo: 'ausente', rotulo: 'Logs de auditoria', re: 'logs de auditoria', alvos: TODOS },
  { id: 'A3', tipo: 'ausente', rotulo: '"registros de autenticação"', re: 'registros de autenticacao', alvos: TODOS },
  { id: 'A4', tipo: 'ausente', rotulo: '"exclusão de prontuários"', re: 'exclusao de prontuarios', alvos: TODOS },
  { id: 'A5', tipo: 'ausente', rotulo: 'promessa de "e-mail do responsável"', re: 'e-mail do responsavel', alvos: TODOS },
  { id: 'A6', tipo: 'ausente', rotulo: '"Última atualização: junho/2026"', re: 'junho/2026', alvos: ['P'] },
  { id: 'A7', tipo: 'ausente', rotulo: '"nascimento" (trava da rodada 4)', re: 'nascimento', alvos: TODOS },
  // frases NOVAS: têm de aparecer
  { id: 'P1', tipo: 'presente', rotulo: 'validação no backend (class-validator)', re: 'class-validator', alvos: TODOS },
  { id: 'P2', tipo: 'presente', rotulo: 'Registro de eventos da esteira', re: 'registro de eventos da esteira', alvos: TODOS },
  { id: 'P3', tipo: 'presente', rotulo: 'conexão SSL "prevista" para produção', re: 'ssl com o banco prevista para o ambiente de producao', alvos: TODOS },
  { id: 'P4', tipo: 'presente', rotulo: 'HTTPS "previsto" para produção', re: 'https previsto para o ambiente de producao', alvos: TODOS },
  { id: 'P5', tipo: 'presente', rotulo: '"prevista/previsto para o ambiente de produção" (SSL e HTTPS: 2 ocorrências)', re: 'previst[oa] para o ambiente de producao', alvos: TODOS, min: 2 },
  { id: 'P6', tipo: 'presente', rotulo: '10 tentativas por IP a cada 15 minutos em produção', re: '10 tentativas por ip a cada 15 minutos em producao', alvos: TODOS },
  { id: 'P7', tipo: 'presente', rotulo: 'tokens JWT "não armazenados no servidor"', re: 'nao armazenados no servidor', alvos: TODOS },
  { id: 'P8', tipo: 'presente', rotulo: '"limite aplicado pela tela" (4 mensagens)', re: 'limite aplicado pela tela', alvos: TODOS },
  { id: 'P9', tipo: 'presente', rotulo: 'direitos: "sem funcionalidade automática no sistema"', re: 'sem funcionalidade automatica no sistema', alvos: TODOS },
  { id: 'P10', tipo: 'presente', rotulo: 'última atualização "novembro de 2026"', re: 'novembro de 2026', alvos: ['P'] },
  { id: 'P11', tipo: 'presente', rotulo: 'título "Contato do responsável"', re: 'contato do responsavel', alvos: ['T', 'F'] },
  { id: 'P12', tipo: 'presente', rotulo: 'aceitação "registrada no navegador do usuário"', re: 'registrada no navegador do usuario', alvos: ['F'] },
];
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').toLowerCase();
function conferir(textos) {
  const nt = Object.fromEntries(Object.entries(textos).map(([k, v]) => [k, norm(v)]));
  return ITENS.map((it) => {
    const res = {};
    for (const k of TODOS) {
      if (!it.alvos.includes(k)) { res[k] = { aplica: false }; continue; }
      if (!nt[k]) { res[k] = { aplica: true, ok: false, ocorrencias: null, motivo: 'texto não lido' }; continue; }
      const n = (nt[k].match(new RegExp(it.re, 'g')) || []).length;
      res[k] = { aplica: true, ocorrencias: n, ok: it.tipo === 'ausente' ? n === 0 : n >= (it.min ?? 1) };
    }
    return { id: it.id, tipo: it.tipo, rotulo: it.rotulo, padrao_normalizado: it.re, resultado: res };
  });
}
function gravarConferencia(textos) {
  const itens = conferir(textos);
  const celula = (r) => (!r.aplica ? '—' : r.ok ? `OK (${r.ocorrencias})` : `FALHA (${r.ocorrencias ?? 'sem texto'})`);
  const falhas = itens.flatMap((i) => TODOS.filter((k) => i.resultado[k].aplica && !i.resultado[k].ok).map((k) => `${i.id}/${k}`));
  const total = itens.reduce((a, i) => a + TODOS.filter((k) => i.resultado[k].aplica).length, 0);
  const json = { commit: COMMIT, data: agora(), tamanho_dos_textos_em_caracteres: Object.fromEntries(Object.entries(textos).map(([k, v]) => [k, (v || '').length])), comparacao: 'sem acentos, sem diferenca de caixa, espacos e quebras de linha unificados', itens, resumo: { verificacoes: total, falhas: falhas.length, lista_de_falhas: falhas } };
  fs.writeFileSync(OUT + 'conferencia_textos.json', JSON.stringify(json, null, 1));
  const md = [
    '# Conferência dos textos legais (rodada 6)', '',
    `Commit: \`${COMMIT}\`. T = modal de termos (pela tela), P = página da Política (pela tela), F = PDF da política (texto extraído com pdftotext). Entre parênteses: número de ocorrências. "—" = não se aplica a esse texto.`, '',
    '| Item | Frase | Tipo | T | P | F |', '|---|---|---|---|---|---|',
    ...itens.map((i) => `| ${i.id} | ${i.rotulo} | ${i.tipo === 'ausente' ? 'deve estar AUSENTE' : 'deve estar PRESENTE'} | ${TODOS.map((k) => celula(i.resultado[k])).join(' | ')} |`), '',
    `**Resultado:** ${total - falhas.length} de ${total} verificações OK; falhas: ${falhas.length ? falhas.join(', ') : 'nenhuma'}.`,
  ].join('\n');
  fs.writeFileSync(OUT + 'conferencia_textos.md', md + '\n');
  console.log(`conferência: ${total - falhas.length}/${total} OK${falhas.length ? '; FALHAS: ' + falhas.join(', ') : ''}`);
  return falhas.length;
}

const b = await abrir();
await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: PDFS.replace(/\//g, '\\') });

// Rola o modal de termos até o primeiro candidato que existir. Cada candidato é [regex, 'start'|'center'] aplicado a elementos-folha do modal.
const rolarModalPara = (p, candidatos) => p.eval((cands) => {
  const folhas = [...document.querySelectorAll('[role=dialog] *')].filter((e) => e.childElementCount === 0);
  for (const [src, bloco] of cands) { const re = new RegExp(src, 'i'); const alvo = folhas.find((e) => re.test(e.textContent.trim())); if (alvo) { alvo.scrollIntoView({ block: bloco }); return src; } }
  return null;
}, candidatos);
// A frase (regex) está inteiramente visível dentro da área rolável do modal?
const visivelNoModal = (p, src) => p.eval((s) => {
  const v = document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'); if (!v) return false;
  const re = new RegExp(s, 'i'); const alvo = [...document.querySelectorAll('[role=dialog] *')].filter((e) => e.childElementCount === 0).find((e) => re.test(e.textContent));
  if (!alvo) return false; const r = alvo.getBoundingClientRect(), vr = v.getBoundingClientRect();
  return r.top >= vr.top - 1 && r.bottom <= vr.bottom + 1;
}, src);

const textos = { T: '', P: '', F: '' };
let primeiraPaginaPdf = '';

// ── (1) modal de termos: texto inteiro e capturas ──
await tente('modal de termos (texto e capturas)', async () => {
  const lg = await (await fetch('http://localhost:3001/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
  if (!lg?.token) throw new Error('login do médico falhou (confira SEED_MEDICO_EMAIL/SEED_MEDICO_SENHA e a API em :3001)');
  const p = await b.newPage({ ...VP, reducedMotion: true });
  // localStorage limpo: o modal de termos abre (primeiro acesso)
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear();localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome ?? '')});}catch(e){}` });
  await p.goto('http://localhost:5173/main', { settleMs: 2500 });
  const abriu = await p.eval(() => !!document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'));
  if (!abriu) throw new Error('o modal de termos não abriu');
  // Texto inteiro: o conteúdo rolável está todo no DOM; se faltar o fim (seção 10), rola em passos e lê de novo.
  let t = await p.eval(() => document.querySelector('[role=dialog]')?.innerText || '');
  if (!/10\.\s*Contato/i.test(t)) {
    for (let i = 0; i < 40; i++) { await p.eval(() => { const v = document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'); if (v) v.scrollTop += 600; }); await sleep(120); }
    t = await p.eval(() => document.querySelector('[role=dialog]')?.innerText || '');
  }
  textos.T = t;
  fs.writeFileSync(OUT + 'texto_modal_termos.txt', t);
  if (!/10\.\s*Contato/i.test(t)) console.log('aviso: não achei a seção 10 no texto do modal; conferir texto_modal_termos.txt');

  // Figura 29: mesmo recorte da rodada 4 (trecho "plataforma Groq", seção 6, centralizado)
  await tente('fig29 (termos, trecho da IA)', async () => {
    if (!(await rolarModalPara(p, [['plataforma Groq', 'center']]))) throw new Error('trecho da IA não encontrado no modal');
    await sleep(500);
    const frase = await visivelNoModal(p, 'limite aplicado pela tela');
    await foto(p, 'fig29_termos_ia_r6.png', { figura: '29', tela: 'Termos de uso, seção do assistente de IA: o nome não é enviado; cita Groq, gpt-oss-120b e Whisper; histórico de até 4 mensagens, limite aplicado pela tela', perfil: 'Médico (primeiro acesso)', paciente: '-', observacoes: `MUDOU em relação à rodada 4: trecho com limite de 4 mensagens alterado ("limite aplicado pela tela"). Frase nova visível no recorte: ${frase}. Mesmo recorte da rodada 4 (seção 6 centralizada); o rodapé com o crédito de autoria não aparece nesta captura` });
  });
  // Extras de conferência visual
  await tente('modal: seção 5 Segurança', async () => {
    if (!(await rolarModalPara(p, [['^5\\.\\s*Seguran', 'start']]))) throw new Error('seção 5 não encontrada');
    await sleep(500);
    await foto(p, 'modal_seguranca_r6.png', { figura: 'extra', tela: 'Termos de uso, seção 5 (Segurança da Informação): validação no backend, SSL e HTTPS previstos para produção, limite de login, tokens JWT', perfil: 'Médico (primeiro acesso)', paciente: '-', observacoes: 'Conferência visual do Passo 1' });
  });
  await tente('modal: seção 7 Direitos do titular', async () => {
    // mostra o fim da seção (a frase nova sobre as solicitações) e, se não achar, o começo
    if (!(await rolarModalPara(p, [['sem funcionalidade autom', 'center'], ['^7\\.\\s*Direitos', 'start']]))) throw new Error('seção 7 não encontrada');
    await sleep(500);
    await foto(p, 'modal_direitos_contato_r6.png', { figura: 'extra', tela: 'Termos de uso, seção 7 (Direitos do Titular): lista de direitos da LGPD e a frase de que, nesta versão, as solicitações são atendidas pelo contato do responsável, sem funcionalidade automática no sistema', perfil: 'Médico (primeiro acesso)', paciente: '-', observacoes: 'Conferência visual do Passo 1. O CONTATO (seção 10) fica longe da seção 7 na janela rolável e está em modal_contato_r6.png' });
  });
  await tente('modal: seção 10 Contato', async () => {
    if (!(await rolarModalPara(p, [['^10\\.\\s*Contato', 'start']]))) throw new Error('seção 10 não encontrada');
    await p.eval(() => { const v = document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'); if (v) v.scrollTop = v.scrollHeight; });
    await sleep(500);
    await foto(p, 'modal_contato_r6.png', { figura: 'extra', tela: 'Termos de uso, seção 10 (Contato do responsável): sem promessa de e-mail nem de encarregado designado', perfil: 'Médico (primeiro acesso)', paciente: '-', observacoes: 'Conferência visual do Passo 1' });
  });
  await p.close();
});

// ── (2) página da Política (texto + captura) e (3) PDF (texto + captura da 1ª página) ──
await tente('página da política e PDF', async () => {
  const p = await pagina('medico', VP); // pagina() deixa os termos como aceitos: o modal não abre
  await ir(p, '/main/politica', 2500);
  textos.P = await texto(p);
  fs.writeFileSync(OUT + 'texto_politica_pagina.txt', textos.P);
  await tente('página da política: medidas de segurança', async () => {
    const achou = await p.eval(() => { const re = /^4\.\s*Medidas de Seguran/i; const alvo = [...document.querySelectorAll('*')].filter((e) => e.childElementCount === 0).find((e) => re.test(e.textContent.trim())); if (!alvo) return false; alvo.scrollIntoView({ block: 'start' }); return true; });
    if (!achou) throw new Error('seção 4 (Medidas de Segurança) não encontrada na página');
    await sleep(600);
    await foto(p, 'politica_pagina_seguranca_r6.png', { figura: 'extra', tela: 'Página da Política, seção 4 (Medidas de Segurança Implementadas)', perfil: 'Médico', paciente: '-', observacoes: 'Conferência visual do Passo 1' });
  });
  // PDF
  const antes = new Set(fs.readdirSync(PDFS));
  await passo(p, 'Baixar PDF', { parcial: true, espera: 4500 });
  const novos = fs.readdirSync(PDFS).filter((f) => !antes.has(f) && /\.pdf$/i.test(f));
  const pdf = novos.find((f) => /Politica/i.test(f)) || novos[0];
  await p.close();
  if (!pdf) throw new Error('o PDF da política não foi gerado');
  textos.F = pdfParaTexto(PDFS + pdf);
  primeiraPaginaPdf = pdfParaTexto(PDFS + pdf, ['-f', '1', '-l', '1']);
  fs.writeFileSync(OUT + 'texto_pdf_politica.txt', textos.F);
  if (!textos.F) throw new Error('pdftotext não devolveu texto (defina PDFTOTEXT=<caminho do pdftotext>)');
  const mudou = /nao armazenados no servidor/.test(norm(primeiraPaginaPdf));
  await pdfParaPng(PDFS + pdf, 'fig30_politica_pdf_pag1_r6.png', { figura: '30', tela: 'Primeira página do PDF da política de dados regenerado', perfil: 'Médico', paciente: '-', observacoes: `Arquivo gerado: ${pdf}. A parte capturada (1ª página) MUDOU em relação à rodada 4: ${mudou ? 'sim, o item "Dados de acesso" agora diz "tokens JWT com validade de 24 horas, não armazenados no servidor", sem "registros de autenticação"' : 'NÃO conferido: a frase nova não foi achada no texto da 1ª página'}. Conferência do PDF inteiro em conferencia_textos.md` });
});

// ── (4) conferência automática ──
const falhas = gravarConferencia(textos);

await fechar();
const colunas = ['arquivo', 'figura', 'tela', 'perfil', 'paciente', 'data_hora', 'commit', 'resultado', 'observacoes'];
fs.writeFileSync(OUT + 'figuras_manifesto.csv', [colunas.join(','), ...manifesto.map((m) => colunas.map((c) => csvCell(m[c])).join(','))].join(String.fromCharCode(10)) + String.fromCharCode(10));
console.log(`${manifesto.filter((m) => m.resultado === 'OK').length} capturas OK, ${manifesto.filter((m) => m.resultado !== 'OK').length} falhas; conferência: ${falhas} falha(s)`);
if (falhas > 0) process.exitCode = 1;
