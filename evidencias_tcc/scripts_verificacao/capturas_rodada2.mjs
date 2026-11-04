// Capturas de tela da rodada 2 (a partir do clone limpo do commit publicado). Banco de TESTE isolado, dados FICTÍCIOS, IA SIMULADA (mock).
// Viewport 1280 x 800, tema claro, zoom 100%, PNG. Usuários: Recepcionista Teste, Enfermeiro Teste, Médico Teste.
// Pacientes: FICTÍCIO-01 a 05 e TESTE A a TESTE E.
// Uso: source <ambiente do banco de teste>; CDP_LIB=<cdp.mjs> EV_DIR=<pasta de saída> COMMIT=<hash> node capturas_rodada2.mjs
//      (API em http://localhost:3001 iniciada com o mock de IA, e o Vite em http://localhost:5173)
// Gera as imagens em EV_DIR/ e o figuras_manifesto.csv. Uma captura que falha NÃO é ocultada: entra no manifesto como FALHA.
// As capturas com o provedor de IA REAL (novo04 a novo07) estão em capturas_ia_real.mjs.
import fs from 'node:fs';
import { pagina, ir, passo, passoRe, digitar, escolherSexo, clicar, sleep, texto, fechar, abrir, apiLogin, admitirUI, mouse, esc } from './cenarios22/lib.mjs';

const OUT = (process.env.EV_DIR || './saida_capturas').replace(/\\/g, '/').replace(/\/?$/, '/');
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
const marcarRadio = (p, v) => p.eval((v) => document.querySelector(`input[type=radio][value=${v}]`)?.click(), v).then(() => sleep(1500));
const buscar = async (p, nome) => { await p.eval(() => document.querySelector('input[aria-label="Pesquisar paciente por nome ou CPF"]')?.focus()); await p.send('Input.insertText', { text: nome }); await sleep(1500); };
const abrirConversa = async (p, nome) => { await ir(p, '/chat', 3500); await passo(p, 'Nova mensagem', { espera: 1000 }); await passo(p, nome, { parcial: true, espera: 1500 }); };
const rolarFoco = (p) => p.eval(() => [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Paciente em foco')?.scrollIntoView({ block: 'start' })).then(() => sleep(1200));
const novaPagina = (papel) => pagina(papel, VP);
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

// ── Dados fictícios pela API ──
const med = await apiLogin('medico'), enf = await apiLogin('enfermeiro'), rec = await apiLogin('recepcionista');
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let n = 0; const suf = String(Date.now()).slice(-6);
const cpf = () => String(81000000000 + Number(suf) * 10 + (++n)).slice(0, 11);
const SV = (o = {}) => ({ saturacao_oxigenio: 98, frequencia_cardiaca: 76, temperatura: 36.6, pressao_arterial: '120/80', ...o });
async function paciente(nome, idade, sexo, extra = {}) { return (await rec('POST', '/patients', { nome_completo: nome, cpf: cpf(), idade, sexo, ...extra })).data; }
async function admitir(p, senha, motivo) { return (await rec('POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, chegada: brt(), status: 'Aguardando Triagem', ...(motivo ? { motivo_visita: motivo } : {}) })).data; }
async function classificar(f, cor, just) { await enf('PUT', `/fila/${f.id}`, { status: 'Em Triagem (Enfermeiro)' }); await enf('PUT', `/fila/${f.id}`, { status: 'Aguardando Atendimento', gravidade: cor, ...(just ? { justificativa: just } : {}) }); }
const pausa = () => sleep(1100); // a ordem de chegada usa o instante gravado no servidor

const b = await abrir();
await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: PDFS.replace(/\//g, '\\') });

// ══ 1) Recepção: cadastro (fig07, novo01, novo02), admissão (fig09, fig10) ══
await tente('recepção: cadastro e admissão', async () => {
  const p = await novaPagina('recepcionista');
  await ir(p, '/main/pacientes');
  await passo(p, 'Adicionar Paciente', { espera: 1200 });
  // novo01: lista de seleção do Sexo aberta
  await clicar(p, 'Sexo'); await sleep(900);
  const abriu = await p.eval(() => [...document.querySelectorAll('[role=option]')].filter((o) => o.offsetWidth || o.offsetHeight).map((o) => o.textContent.trim()));
  if (!abriu.includes('Masculino') || !abriu.includes('Feminino')) throw new Error('a lista do Sexo não abriu: ' + JSON.stringify(abriu));
  await foto(p, 'novo01_sexo_select_aberto.png', { figura: 'Detalhe do cadastro (4.3.5)', tela: 'Cadastro de paciente: lista de seleção do campo Sexo aberta (Masculino e Feminino)', perfil: 'Recepcionista', paciente: '(formulário vazio)' });
  await passo(p, 'Feminino', { espera: 500 }); // escolher a opção fecha a lista (Esc fecharia o formulário inteiro)
  // fig07: cadastro preenchido (só o nome é obrigatório; "Nome desconhecido" visível)
  await digitar(p, 'Nome Completo', 'TESTE A'); await digitar(p, 'CPF', '81000000901'); await digitar(p, 'Idade', '34');
  await foto(p, 'fig07_cadastro.png', { figura: '7', tela: 'Cadastro de paciente: Nome como único campo obrigatório, Sexo em lista e opção "Nome desconhecido"', perfil: 'Recepcionista', paciente: 'TESTE A', observacoes: 'Formulário preenchido com dados fictícios; CPF, idade e sexo são opcionais' });
  await passoRe(p, /^Salvar e Registrar/, { espera: 1800 }); await esc(p);
  // novo02a: Nome desconhecido marcado
  await ir(p, '/main/pacientes');
  await passo(p, 'Adicionar Paciente', { espera: 1200 });
  await passo(p, 'Nome desconhecido', { parcial: true, espera: 700 });
  await foto(p, 'novo02a_nome_desconhecido_marcado.png', { figura: 'Detalhe do cadastro (4.3.5)', tela: 'Cadastro com "Nome desconhecido" marcado: campo Nome travado com "Paciente não identificado (#xxxx)"', perfil: 'Recepcionista', paciente: '(nome provisório)' });
  await passoRe(p, /^Salvar e Registrar/, { espera: 2000 }); await esc(p);
  // novo02b: lista com o selo
  await ir(p, '/main/pacientes'); await buscar(p, 'Paciente não identificado');
  await foto(p, 'novo02b_lista_selo_nome_provisorio.png', { figura: 'Detalhe do cadastro (4.3.5)', tela: 'Lista de pacientes com o selo "Nome provisório"', perfil: 'Recepcionista', paciente: 'Paciente não identificado (#xxxx)' });
  // fig09: admissão com motivo (TESTE A)
  await ir(p, '/main/alertas', 2200);
  await passo(p, 'Admitir Paciente', { espera: 1200 });
  await digitar(p, 'Nome ou CPF', 'TESTE A'); await sleep(600);
  await passo(p, 'TESTE A', { parcial: true, espera: 1000 });
  await digitar(p, 'Motivo da visita', 'Dor lombar há 3 horas (texto fictício)');
  await p.eval(() => document.querySelector('textarea')?.scrollIntoView({ block: 'center' })); await sleep(500);
  await foto(p, 'fig09_admissao.png', { figura: '9', tela: 'Admitir na esteira: paciente selecionado, histórico à direita e campo Motivo da visita preenchido', perfil: 'Recepcionista', paciente: 'TESTE A', observacoes: 'O campo Motivo da visita fica abaixo do histórico; a captura mostra o trecho com o motivo e o botão Admitir' });
  await passoRe(p, /^Admitir( como| —)/, { espera: 1800 }); await esc(p);
  await ir(p, '/main/alertas', 2200);
  await foto(p, 'fig10_esteira_recem_admitido.png', { figura: '10', tela: 'Esteira com o paciente recém-admitido aguardando triagem', perfil: 'Recepcionista', paciente: 'TESTE A' });
  await p.close();
});

// ══ 2) Enfermeiro: sinais, seletor de cor, recusa de temperatura ══
// Pacientes de apoio (FICTÍCIO-01 a 05) criados pela API para as telas seguintes
const F = {}; const E = {};
for (const [k, nome, idade, sexo] of [['1', 'FICTÍCIO-01', 34, 'F'], ['2', 'FICTÍCIO-02', 52, 'M'], ['3', 'FICTÍCIO-03', 29, 'F'], ['4', 'FICTÍCIO-04', 61, 'M'], ['5', 'FICTÍCIO-05', 44, 'F']]) F[k] = await paciente(nome, idade, sexo);
// histórico de sinais do FICTÍCIO-01 (gráfico)
for (const s of [SV({ saturacao_oxigenio: 96, frequencia_cardiaca: 88, temperatura: 37.4 }), SV({ saturacao_oxigenio: 94, frequencia_cardiaca: 96, temperatura: 38.1 }), SV({ saturacao_oxigenio: 95, frequencia_cardiaca: 92, temperatura: 37.9 }), SV({ saturacao_oxigenio: 97, frequencia_cardiaca: 84, temperatura: 37.2 })]) { await enf('POST', `/sinais/${F[1].id}`, s); await sleep(300); }
for (const k of [2, 3, 4, 5]) await enf('POST', `/sinais/${F[k].id}`, SV(k === 2 ? { saturacao_oxigenio: 90 } : {}));

await tente('enfermeiro: sinais (fig08), seletor de cor (fig11/fig12)', async () => {
  const p = await novaPagina('enfermeiro');
  await ir(p, '/main/pacientes'); await buscar(p, 'TESTE A');
  await passo(p, 'Editar', { dentro: 'TESTE A', espera: 1500 }); await passo(p, 'Sinais & Triagem', { espera: 800 });
  await digitar(p, 'Temperatura', '36.7'); await digitar(p, 'SpO', '97'); await digitar(p, 'FC (bpm)', '78'); await digitar(p, 'Pressão', '120/80');
  await foto(p, 'fig08_sinais_vitais.png', { figura: '8', tela: 'Registro dos sinais vitais (temperatura, SpO₂, pressão arterial e FC)', perfil: 'Enfermeiro', paciente: 'TESTE A', observacoes: 'Aba Sinais & Triagem da edição do paciente' });
  await passo(p, 'Salvar Alterações', { espera: 1800 }); await esc(p);
  await ir(p, '/main/alertas', 2200);
  await passo(p, 'Iniciar Triagem', { dentro: 'TESTE A', espera: 1500 });
  await digitar(p, 'Justificativa', 'Escolha manual do enfermeiro (texto fictício)').catch(() => {});
  await foto(p, 'fig11_seletor_cor.png', { figura: '11', tela: 'Seletor manual de cor de risco, com justificativa opcional e a nota "o sistema não controla prazos"', perfil: 'Enfermeiro', paciente: 'TESTE A' });
  await passo(p, 'Verde', { dentro: 'TESTE A', parcial: true, espera: 1800 });
  await foto(p, 'fig12_risco_aguardando_medico.png', { figura: '12', tela: 'Paciente com a cor registrada, aguardando atendimento médico', perfil: 'Enfermeiro', paciente: 'TESTE A' });
  await p.close();
});

await tente('enfermeiro: recusa de temperatura (fig20)', async () => {
  const p = await novaPagina('enfermeiro');
  await ir(p, '/main/pacientes'); await buscar(p, 'FICTÍCIO-04');
  await passo(p, 'Editar', { dentro: 'FICTÍCIO-04', espera: 1500 }); await passo(p, 'Sinais & Triagem', { espera: 800 });
  await digitar(p, 'Temperatura', '46');
  await passo(p, 'Salvar Alterações', { espera: 1800 });
  await foto(p, 'fig20_recusa_temperatura.png', { figura: '20', tela: 'Aviso de recusa de temperatura fora da faixa (valor artificial de 46 °C)', perfil: 'Enfermeiro', paciente: 'FICTÍCIO-04', observacoes: 'O servidor aceita de 25 a 45 °C' });
  await p.close();
});

// Nome provisório: edição (novo09)
await tente('enfermeiro: corrigir nome provisório (novo09)', async () => {
  const prov = ((await med('GET', '/patients')).data ?? []).find((x) => x.nome_provisorio);
  if (!prov) throw new Error('nenhum paciente com nome provisório encontrado');
  const p = await novaPagina('enfermeiro');
  await ir(p, '/main/pacientes'); await buscar(p, 'Paciente não identificado');
  await passo(p, 'Editar', { dentro: 'Paciente não identificado', espera: 1500 });
  await digitar(p, 'Nome Completo', 'TESTE B');
  await foto(p, 'novo09a_editar_nome_provisorio.png', { figura: 'Detalhe do cadastro (4.3.5)', tela: 'Edição do paciente: nome provisório sendo corrigido (selo "Nome provisório" no cabeçalho)', perfil: 'Enfermeiro', paciente: 'TESTE B (antes: nome provisório)' });
  await passo(p, 'Salvar Alterações', { espera: 2000 }); await esc(p);
  await ir(p, '/main/pacientes'); await buscar(p, 'TESTE B');
  await foto(p, 'novo09b_lista_sem_selo.png', { figura: 'Detalhe do cadastro (4.3.5)', tela: 'Lista de pacientes depois da correção do nome: sem o selo "Nome provisório"', perfil: 'Enfermeiro', paciente: 'TESTE B' });
  await p.close();
});

// ══ 3) Esteira completa (FICTÍCIO-01 a 05 + TESTE C, D, E) ══
const cores = { 1: 'Vermelho', 2: 'Laranja', 3: 'Amarelo', 4: 'Verde', 5: 'Azul' };
for (const k of [1, 2, 3, 4, 5]) { E[k] = await admitir(F[k], ''); await pausa(); }
for (const k of [1, 2, 3, 4, 5]) await classificar(E[k], cores[k], k === 1 ? 'Escolha manual do enfermeiro (texto fictício)' : undefined);

await tente('recepção: esteira ordenada (fig21), lista com alta (fig15), sem eventos (fig25)', async () => {
  const tc = await paciente('TESTE C', 41, 'F'), td = await paciente('TESTE D', 57, 'M'), te = await paciente('TESTE E', 25, 'F');
  await enf('POST', `/sinais/${tc.id}`, SV({ temperatura: 38.6, saturacao_oxigenio: 91, pressao_arterial: '100/60', frequencia_cardiaca: 110 }));
  await enf('POST', `/sinais/${td.id}`, SV({ temperatura: 36.0, frequencia_cardiaca: 55, pressao_arterial: '110/70' }));
  await enf('POST', `/sinais/${te.id}`, SV({ temperatura: 38.5, saturacao_oxigenio: 92, pressao_arterial: '130/85', frequencia_cardiaca: 88 }));
  const ftc = await admitir(tc, ''); await pausa(); await admitir(td, ''); await pausa(); const fte = await admitir(te, '');
  await classificar(ftc, 'Amarelo');
  const p = await novaPagina('recepcionista');
  await ir(p, '/main/alertas', 2500);
  // Deixa a coluna "Atendimento médico" só com o que explica a ordem: tira o TESTE A (já usado) e põe o TESTE E aguardando o médico SEM cor (vai ao fim)
  const filaAgora = (await med('GET', '/fila')).data ?? [];
  const eA = filaAgora.find((x) => x.nome === 'TESTE A'); if (eA) await med('DELETE', `/fila/${eA.id}`);
  await med('PUT', `/fila/${fte.id}`, { status: 'Aguardando Atendimento' });
  await ir(p, '/main/alertas', 2500);
  await foto(p, 'fig21_prioridade_esteira.png', { figura: '21 (parte 1 de 2)', tela: 'Esteira ordenada por prioridade, parte de cima da coluna "Atendimento médico": Vermelho, Laranja e os dois Amarelo', perfil: 'Recepcionista', paciente: 'FICTÍCIO-01 a 05, TESTE C e E', observacoes: 'A coluna é mais alta que a janela de 800 px: a figura foi dividida em duas capturas (esta e fig21b)' });
  await p.eval(() => { for (const e of document.querySelectorAll('*')) if (e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible') e.scrollTop = e.scrollHeight; }); await sleep(900);
  await foto(p, 'fig21b_prioridade_esteira_fim.png', { figura: '21 (parte 2 de 2)', tela: 'Esteira ordenada por prioridade, fim da coluna "Atendimento médico": Verde, Azul e, por último, o paciente sem classificação', perfil: 'Recepcionista', paciente: 'FICTÍCIO-04, FICTÍCIO-05 e TESTE E (sem cor)', observacoes: 'Continuação da fig21' });
  // com alta: o médico dá alta ao FICTÍCIO-05 pela API para a lista "Com alta"
  await med('PUT', `/fila/${E[5].id}`, { status: 'Em Consulta (Médico)' }); await med('PATCH', `/fila/${E[5].id}/alta`);
  await ir(p, '/main/pacientes'); await marcarRadio(p, 'alta');
  await foto(p, 'fig15_lista_com_alta.png', { figura: '15', tela: 'Lista de pacientes com alta e botão Readmitir', perfil: 'Recepcionista', paciente: 'FICTÍCIO-05' });
  await ir(p, '/main/pacientes'); await buscar(p, 'FICTÍCIO-01'); await passo(p, 'Visualizar', { dentro: 'FICTÍCIO-01', espera: 1500 }); await passo(p, 'Histórico', { parcial: true, espera: 1500 });
  await foto(p, 'fig25_historico_sem_eventos.png', { figura: '25', tela: 'Histórico de visitas sem o "Registro de eventos" (a recepção não acessa a rota)', perfil: 'Recepcionista', paciente: 'FICTÍCIO-01', observacoes: `GET /patients/:id/eventos pela recepção: HTTP ${(await rec('GET', `/patients/${F[1].id}/eventos`)).status}` });
  await p.close();
});

await tente('médico: painel (fig16, fig22), consulta (fig13), alta (fig14)', async () => {
  const p = await novaPagina('medico');
  await ir(p, '/main', 3000);
  await foto(p, 'fig16_painel.png', { figura: '16 (parte 1 de 2)', tela: 'Painel: resumo dos sinais críticos no título, indicadores e esteira agora', perfil: 'Médico', paciente: 'FICTÍCIO-01 a 05, TESTE A a E', observacoes: 'O painel é mais alto que a janela: a lista "atenção agora" está na captura fig16b' });
  await p.eval(() => [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && /^Atenção agora/.test(e.textContent.trim()))?.scrollIntoView({ block: 'start' })); await sleep(1200);
  await foto(p, 'fig16b_painel_atencao_agora.png', { figura: '16 (parte 2 de 2)', tela: 'Painel: lista "atenção agora" com os pacientes de sinais críticos', perfil: 'Médico', paciente: 'FICTÍCIO-02 (SpO₂ 90), TESTE C (SpO₂ 91, FC 110, 38,6 °C), TESTE D (FC 55)', observacoes: 'Continuação da fig16' });
  await ir(p, '/main', 2500);
  await passo(p, 'TESTE E', { parcial: true, espera: 1500 }); await rolarFoco(p);
  await foto(p, 'fig22_painel_atencao_f14.png', { figura: '22', tela: 'Painel no cenário de fronteira F14 (SpO₂ 92 e temperatura 38,5 em TESTE E; FC 55 em TESTE D; SpO₂ 91, FC 110 e 38,6 em TESTE C)', perfil: 'Médico', paciente: 'TESTE C, D e E', observacoes: 'Paciente em foco: TESTE E (valores exatos da fronteira)' });
  await ir(p, '/main/alertas', 2200);
  await passo(p, 'Chamar', { dentro: 'FICTÍCIO-02', espera: 1500 });
  await foto(p, 'fig13_consulta.png', { figura: '13', tela: 'Paciente em consulta, com as opções Observação e Alta', perfil: 'Médico', paciente: 'FICTÍCIO-02' });
  await passo(p, 'Alta', { dentro: 'FICTÍCIO-02', espera: 1200 });
  await digitar(p, 'Medicamentos e Orientações', 'Paracetamol 500 mg se dor (texto fictício)'); await digitar(p, 'Orientações à Equipe', 'Retornar se piorar (texto fictício)');
  await foto(p, 'fig14_janela_alta.png', { figura: '14', tela: 'Janela de alta com orientações e exportação da guia em PDF', perfil: 'Médico', paciente: 'FICTÍCIO-02' });
  await passo(p, 'Exportar Guia e Dar Alta', { espera: 3500 });
  await p.close();
});

await tente('enfermeiro: gráfico (fig17), chat urgente (fig18), eventos (fig24)', async () => {
  const p = await novaPagina('enfermeiro');
  await ir(p, '/main', 2800); await passo(p, 'FICTÍCIO-01', { parcial: true, espera: 1500 }); await rolarFoco(p);
  await foto(p, 'fig17_historico_sinais.png', { figura: '17', tela: 'Histórico de sinais vitais em gráfico de linhas (FC, SpO₂ e temperatura)', perfil: 'Enfermeiro', paciente: 'FICTÍCIO-01' });
  await abrirConversa(p, 'Médico Teste');
  await passo(p, 'Marcar como urgente', { parcial: true, espera: 600 });
  await p.eval(() => { const i = document.querySelector('textarea, input[placeholder^="Mensagem"]'); i?.focus(); });
  await p.send('Input.insertText', { text: 'Paciente FICTÍCIO-01 com saturação em queda (mensagem fictícia)' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(1500);
  await foto(p, 'fig18_chat_urgente.png', { figura: '18', tela: 'Chat interno com mensagem marcada como urgente', perfil: 'Enfermeiro', paciente: 'FICTÍCIO-01 (citado na mensagem)' });
  await ir(p, '/main/pacientes'); await buscar(p, 'FICTÍCIO-01'); await passo(p, 'Visualizar', { dentro: 'FICTÍCIO-01', espera: 1500 }); await passo(p, 'Histórico', { parcial: true, espera: 1500 });
  await foto(p, 'fig24_registro_eventos.png', { figura: '24', tela: 'Registro de eventos com autor, perfil, hora, cor e justificativa', perfil: 'Enfermeiro', paciente: 'FICTÍCIO-01' });
  await p.close();
});

// ══ 4) Público / documentos ══
await tente('login (fig06)', async () => { const p = await pagina(null, VP); await ir(p, '/'); await foto(p, 'fig06_acesso.png', { figura: '6', tela: 'Tela de acesso (e-mail e senha)', perfil: '(sem sessão)', paciente: '-' }); await p.close(); });

await tente('termos de uso: seção da IA (novo03)', async () => {
  const lg = await (await fetch('http://localhost:3001/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
  const p = await b.newPage({ ...VP, reducedMotion: true });
  await p.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear();localStorage.setItem('token',${JSON.stringify(lg.token)});localStorage.setItem('role',${JSON.stringify(lg.role)});localStorage.setItem('nome',${JSON.stringify(lg.nome ?? '')});}catch(e){}` });
  await p.goto('http://localhost:5173/main', { settleMs: 2500 });
  const achou = await p.eval(() => { const v = document.querySelector('[role=dialog] .mantine-ScrollArea-viewport'); const alvo = [...document.querySelectorAll('[role=dialog] *')].find((e) => e.childElementCount === 0 && /plataforma Groq/.test(e.textContent)); if (!alvo || !v) return false; alvo.scrollIntoView({ block: 'center' }); return true; });
  if (!achou) throw new Error('modal de termos ou trecho da IA não encontrado');
  await sleep(500);
  await foto(p, 'novo03_termos_secao_ia.png', { figura: 'Seção 4.3.4', tela: 'Termos de uso, seção do assistente de IA: o nome não é enviado; cita Groq, gpt-oss-120b e Whisper', perfil: 'Médico (primeiro acesso)', paciente: '-', observacoes: 'Parte do texto que explica a figura (a janela é longa); o rodapé com o crédito de autoria não aparece nesta captura' });
  await p.close();
});

await tente('política em PDF (novo10)', async () => {
  const p = await novaPagina('medico');
  await ir(p, '/main/politica', 2000);
  const antes = new Set(fs.readdirSync(PDFS));
  await passo(p, 'Baixar PDF', { parcial: true, espera: 4500 });
  const novos = fs.readdirSync(PDFS).filter((f) => !antes.has(f) && /Politica/i.test(f));
  await p.close();
  if (!novos[0]) throw new Error('o PDF da política não foi gerado');
  const txt = (await import('node:child_process')).spawnSync('pdftotext', ['-enc', 'UTF-8', PDFS + novos[0], '-'], { encoding: 'utf8' }).stdout || '';
  const confere = `nome não é enviado à IA=${/nome[^.]{0,80}n[aã]o s[aã]o enviados|nao sao enviados|nao e enviado|não é enviado/i.test(txt)}; cita Groq=${/Groq/.test(txt)}; cita Ollama/Qwen/Llama=${/ollama|qwen|llama/i.test(txt)}`;
  await pdfParaPng(PDFS + novos[0], 'novo10_politica_pdf.png', { figura: 'Seção 4.3.4', tela: 'Primeira página do PDF da política de dados regenerado', perfil: 'Médico', paciente: '-', observacoes: `Conferência do texto do PDF inteiro (pdftotext): ${confere}` });
});

await tente('prontuário em PDF (fig19)', async () => {
  const p = await novaPagina('medico');
  await ir(p, '/main/exportar');
  await digitar(p, 'Nome do paciente', 'FICTÍCIO-01'); await passo(p, 'Buscar', { espera: 1800 });
  await passo(p, 'FICTÍCIO-01', { parcial: true, espera: 1800 });
  const antes = new Set(fs.readdirSync(PDFS));
  await passo(p, 'Prontuário', { espera: 3500 });
  const novos = fs.readdirSync(PDFS).filter((f) => !antes.has(f) && /prontuario/i.test(f));
  await p.close();
  if (!novos[0]) throw new Error('o PDF do prontuário não foi gerado');
  await pdfParaPng(PDFS + novos[0], 'fig19_prontuario_pdf.png', { figura: '19', tela: 'Prontuário exportado em PDF (página 1)', perfil: 'Médico', paciente: 'FICTÍCIO-01', observacoes: 'Recorte da folha no visualizador de PDF do navegador' });
});

// ══ 5) Erro 429 SIMULADO pelo mock (novo08) ══
await tente('erro 429 simulado (novo08)', async () => {
  const p = await novaPagina('enfermeiro');
  await ir(p, '/main/monitor', 2500);
  await p.eval(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder?.startsWith('Selecionar')); i?.click(); i?.focus(); }); await sleep(600);
  await p.send('Input.insertText', { text: 'FICTÍCIO-01' }); await sleep(1200);
  await p.eval(() => document.querySelector('[role=option]')?.click()); await sleep(2000);
  await p.eval(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder?.startsWith('Mensagem')); i?.focus(); });
  await p.send('Input.insertText', { text: '__ERRO_429__' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(3500);
  await foto(p, 'novo08_erro_429.png', { figura: 'Seção 5.1.4', tela: 'O que o usuário vê quando o provedor de IA recusa a chamada por limite (HTTP 429 do provedor, que o backend devolve como erro 500 "Assistente clínico indisponível")', perfil: 'Enfermeiro', paciente: 'FICTÍCIO-01', observacoes: 'SIMULADO: a resposta 429 foi produzida pelo mock da IA (nenhuma chamada real foi feita). Rotular a figura como simulada' });
  await p.close();
});

await fechar();
const cab = ['arquivo', 'figura', 'tela', 'perfil', 'paciente', 'data_hora', 'commit', 'resultado', 'observacoes'];
fs.writeFileSync(OUT + 'figuras_manifesto_parcial.csv', [cab.join(','), ...manifesto.map((m) => cab.map((c) => csvCell(m[c])).join(','))].join('\n') + '\n');
console.log(`\n${manifesto.filter((m) => m.resultado === 'OK').length} itens OK, ${manifesto.filter((m) => m.resultado === 'FALHA').length} falhas`);
