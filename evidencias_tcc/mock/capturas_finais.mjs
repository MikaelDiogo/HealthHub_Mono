// Execução final de capturas do pacote do TCC. Local, banco de teste isolado, dados fictícios, IA só com mock.
// Uso: source testenv; PACOTE=<pasta saída> EV_DIR=<pasta temporária> node capturas_finais.mjs
// Não lê nem imprime credenciais (vêm de SEED_* do ambiente de teste).
import fs from 'node:fs';
import { pagina, ir, passo, passoRe, digitar, sleep, texto, fechar, abrir, apiLogin, admitirUI, mouse } from '../../evidencias_testes_2026-10-29/runner/lib.mjs';

const PAC = process.env.PACOTE;
if (!PAC) throw new Error('Defina PACOTE');
const IMG = `${PAC}/imagens`, PDF = `${PAC}/pdfs_gerados`;
for (const d of ['medico', 'enfermeiro', 'recepcionista', 'publico']) fs.mkdirSync(`${IMG}/${d}`, { recursive: true });
fs.mkdirSync(PDF, { recursive: true });

const manifesto = [];
async function foto(page, pasta, arq, descricao) {
  await sleep(500);
  await page.screenshot({ path: `${IMG}/${pasta}/${arq}`, format: 'png' });
  manifesto.push({ arquivo: `imagens/${pasta}/${arq}`, descricao });
  console.log('✓', pasta, arq);
}
const tente = async (nome, fn) => { try { await fn(); } catch (e) { manifesto.push({ falha: nome, causa: String(e.message).slice(0, 200) }); console.log('✗', nome, e.message); } };
const esc = async (p) => { await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(500); };
const marcarRadio = (p, v) => p.eval((v) => document.querySelector(`input[type=radio][value=${v}]`)?.click(), v).then(() => sleep(1500));

const abrirConversa = async (p, nome) => { await ir(p, '/chat', 3500); await passo(p, 'Nova mensagem', { espera: 1000 }); await passo(p, nome, { parcial: true, espera: 1500 }); };
const buscar = async (p, nome) => { await p.eval(() => document.querySelector('input[aria-label="Pesquisar paciente por nome ou CPF"]')?.focus()); await p.send('Input.insertText', { text: nome }); await sleep(1500); };

// ── Dados fictícios (API, banco de teste) ──
const med = await apiLogin('medico'), enf = await apiLogin('enfermeiro'), rec = await apiLogin('recepcionista');
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let n = 0;
const cpf = () => String(98000000000 + (++n));
const SV = { ok: { saturacao_oxigenio: 98, frequencia_cardiaca: 76, temperatura: 36.6, pressao_arterial: '120/80' } };
async function paciente(nome, idade, sexo = 'F') { return (await rec('POST', '/patients', { nome_completo: nome, cpf: cpf(), idade, sexo })).data; }
async function admitir(p, senha, motivo) { return (await rec('POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, senha, chegada: brt(), status: 'Aguardando Triagem', ...(motivo ? { motivo_visita: motivo } : {}) })).data; }
async function classificar(f, cor, just) { await enf('PUT', `/fila/${f.id}`, { status: 'Em Triagem (Enfermeiro)' }); await enf('PUT', `/fila/${f.id}`, { status: 'Aguardando Atendimento', gravidade: cor, ...(just ? { justificativa: just } : {}) }); }

const carla = await paciente('Carla Dias Mendes', 52);
const diego = await paciente('Diego Alves Prado', 38, 'M');
const elisa = await paciente('Elisa Rocha Vidal', 29);
const fabio = await paciente('Fábio Nunes Torres', 61, 'M');
const gisele = await paciente('Gisele Prado Lins', 44);
const hugo = await paciente('Hugo Melo Barros', 70, 'M');
const iara = await paciente('Iara Campos Lopes', 35);
const bruno = await paciente('Bruno Costa Ribeiro', 47, 'M');
const ana = await paciente('Ana Lima Freitas', 33);
const jonas = await paciente('Jonas Teixeira Rocha', 26, 'M'); // será admitido pela interface (recepção)

// Histórico de sinais da Carla (gráfico)
for (const s of [{ saturacao_oxigenio: 96, frequencia_cardiaca: 88, temperatura: 37.4, pressao_arterial: '130/85' }, { saturacao_oxigenio: 94, frequencia_cardiaca: 96, temperatura: 38.1, pressao_arterial: '135/88' }, { saturacao_oxigenio: 92, frequencia_cardiaca: 104, temperatura: 38.6, pressao_arterial: '140/90' }, { saturacao_oxigenio: 95, frequencia_cardiaca: 92, temperatura: 37.8, pressao_arterial: '132/86' }]) { await enf('POST', `/sinais/${carla.id}`, s); await sleep(250); }
for (const p of [diego, elisa, fabio, gisele, hugo, iara]) await enf('POST', `/sinais/${p.id}`, SV.ok);

const fCarla = await admitir(carla, 'PR-001', 'Falta de ar há 2 dias (texto fictício)'); await classificar(fCarla, 'Vermelho', 'Escolha manual do enfermeiro (texto fictício)');
const fDiego = await admitir(diego, 'PR-002', 'Dor torácica (texto fictício)'); await classificar(fDiego, 'Laranja');
const fElisa = await admitir(elisa, 'PR-003', 'Febre (texto fictício)'); await classificar(fElisa, 'Amarelo');
const fFabio = await admitir(fabio, 'PR-004', 'Dor abdominal (texto fictício)'); await classificar(fFabio, 'Amarelo');
const fGisele = await admitir(gisele, 'PR-005', 'Corte no braço (texto fictício)'); await classificar(fGisele, 'Verde');
const fHugo = await admitir(hugo, 'PR-006'); await classificar(fHugo, 'Verde');
await med('PUT', `/fila/${fHugo.id}`, { status: 'Em Consulta (Médico)' }); await med('PUT', `/fila/${fHugo.id}`, { status: 'Em Observação' });
const fIara = await admitir(iara, 'PR-007'); await classificar(fIara, 'Azul'); await med('PUT', `/fila/${fIara.id}`, { status: 'Em Consulta (Médico)' }); await med('PATCH', `/fila/${fIara.id}/alta`); // fica "com alta" → readmissão
const fBruno = await admitir(bruno, 'PR-008', 'Tontura (texto fictício)'); await enf('PUT', `/fila/${fBruno.id}`, { status: 'Em Triagem (Enfermeiro)' }); // SEM sinais → bloqueio
const fAna = await admitir(ana, 'PR-009', 'Dor de cabeça (texto fictício)'); await enf('PUT', `/fila/${fAna.id}`, { status: 'Em Triagem (Enfermeiro)' }); // para o erro de temperatura
// Chat interno: mensagem urgente (API do chat é por socket; a mensagem urgente é enviada pela interface abaixo)

const b = await abrir();
await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: PDF.replace(/\//g, '\\') });

// ── Público ──
await tente('login', async () => { const p = await pagina(null); await ir(p, '/'); await foto(p, 'publico', '01_login.png', 'Tela de login'); await p.close(); });
await tente('termos/politica', async () => { const p = await pagina('medico'); await ir(p, '/main/politica'); await foto(p, 'publico', '02_politica_de_dados.png', 'Política de Dados (tela)'); await p.close(); });

// ── Recepção ──
await tente('recepção', async () => {
  const p = await pagina('recepcionista');
  await ir(p, '/main/pacientes');
  await foto(p, 'recepcionista', '01_pacientes.png', 'Pacientes (recepção)');
  await passo(p, 'Adicionar Paciente', { espera: 1200 });
  await digitar(p, 'Nome Completo', 'Lara Moura Teste'); await digitar(p, 'CPF', '97000000001'); await digitar(p, 'Idade', '30'); await digitar(p, 'Sexo', 'F');
  await foto(p, 'recepcionista', '02_cadastro_paciente_campos_obrigatorios.png', 'Cadastro de paciente com os campos obrigatórios preenchidos');
  await passoRe(p, /^Salvar e Registrar/, { espera: 1800 }); await esc(p);
  await ir(p, '/main/alertas', 2200);
  await passo(p, 'Admitir Paciente', { espera: 1200 });
  await foto(p, 'recepcionista', '03_admitir_lista.png', 'Admissão na esteira: busca de paciente');
  await esc(p);
  await admitirUI(p, 'Jonas Teixeira Rocha', 'Dor lombar (texto fictício)');
  await sleep(800);
  await ir(p, '/main/alertas', 2200);
  await foto(p, 'recepcionista', '04_esteira_recepcao.png', 'Esteira (recepção) com paciente recém-admitido');
  await ir(p, '/main/pacientes'); await marcarRadio(p, 'alta');
  await foto(p, 'recepcionista', '05_pacientes_com_alta_readmitir.png', 'Lista com alta e botão de readmissão');
  await abrirConversa(p, 'Dr. João Silva');
  await foto(p, 'recepcionista', '06_chat_com_medico.png', 'Chat interno (recepção)');
  await p.close();
});

// ── Enfermeiro ──
await tente('enfermeiro', async () => {
  const p = await pagina('enfermeiro');
  await ir(p, '/main/alertas', 2200);
  await foto(p, 'enfermeiro', '01_esteira_prioridade_por_cor.png', 'Esteira com pacientes aguardando; cores diferentes e duas da mesma cor (Amarelo)');
  await passoRe(p, /^Vermelho|Amarelo|Laranja|Verde|Azul/, { dentro: 'Bruno Costa', espera: 1800 }).catch(() => {});
  await foto(p, 'enfermeiro', '02_bloqueio_sem_sinais.png', 'Seletor de risco: aviso de bloqueio quando não há sinais vitais');
  await passo(p, 'Amarelo', { dentro: 'Ana Lima', parcial: true, espera: 1200 }).catch(() => {});
  await foto(p, 'enfermeiro', '03_seletor_de_risco_justificativa.png', 'Seletor de risco manual com justificativa opcional e nota de limite (sem controle de prazo)');
  await ir(p, '/main/pacientes');
  await passo(p, 'Editar', { dentro: 'Ana Lima', espera: 1500 }); await passo(p, 'Sinais & Triagem', { espera: 800 });
  await digitar(p, 'Temperatura', '60');
  await passo(p, 'Salvar Alterações', { espera: 1500 });
  await foto(p, 'enfermeiro', '04_erro_temperatura_fora_da_faixa.png', 'Aviso de erro: temperatura fora da faixa');
  await digitar(p, 'Temperatura', '36.7').catch(() => {}); await digitar(p, 'SpO₂', '97').catch(() => {}); await digitar(p, 'FC (bpm)', '78').catch(() => {}); await digitar(p, 'Pressão', '120/80').catch(() => {});
  await foto(p, 'enfermeiro', '05_registro_de_sinais_vitais.png', 'Registro de sinais vitais (enfermeiro)');
  await passo(p, 'Salvar Alterações', { espera: 1800 }); await esc(p);
  await ir(p, '/main/alertas', 2200);
  await passo(p, 'Verde', { dentro: 'Ana Lima', parcial: true, espera: 1500 }).catch(() => {});
  await foto(p, 'enfermeiro', '06_paciente_com_risco_aguardando_medico.png', 'Paciente com risco registrado aguardando médico');
  await ir(p, '/main/monitor', 2500);
  await p.eval(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder?.startsWith('Selecionar')); i?.click(); i?.focus(); }); await sleep(600);
  await passo(p, 'Carla Dias Mendes', { parcial: true, espera: 1800 });
  await foto(p, 'enfermeiro', '07_monitoramento_ultima_leitura.png', 'Monitoramento: última leitura de triagem do paciente (sem gráfico nesta tela)');
  await p.eval(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder?.startsWith('Mensagem')); i?.focus(); });
  await p.send('Input.insertText', { text: 'Resuma o caso (pergunta fictícia)' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(3500);
  await foto(p, 'enfermeiro', '08_chat_ia_resposta_simulada.png', 'Chat de IA: resposta do MOCK, rotulada "RESPOSTA SIMULADA — NÃO É DO MODELO REAL"');
  await abrirConversa(p, 'Dr. João Silva');
  await passo(p, 'Marcar como urgente', { parcial: true, espera: 600 });
  await p.eval(() => { const i = document.querySelector('textarea, input[placeholder^="Mensagem"]'); i?.focus(); });
  await p.send('Input.insertText', { text: 'Paciente Carla Dias com saturação em queda (mensagem fictícia)' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(1500);
  await foto(p, 'enfermeiro', '09_chat_mensagem_urgente.png', 'Chat interno com mensagem marcada como urgente');
  await ir(p, '/main'); await passo(p, 'Carla Mendes', { parcial: true, espera: 1500 }); await p.eval(() => [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Paciente em foco')?.scrollIntoView({ block: 'start' })); await sleep(1200);
  await foto(p, 'enfermeiro', '07b_historico_sinais_vitais_grafico.png', 'Painel › Paciente em foco: histórico de sinais vitais com gráfico (FC, SpO₂ e temperatura)');
  await ir(p, '/main/pacientes'); await buscar(p, 'Carla'); await passo(p, 'Visualizar', { dentro: 'Carla Dias', espera: 1500 }); await passo(p, 'Histórico', { parcial: true, espera: 1500 });
  await foto(p, 'enfermeiro', '10_registro_de_eventos_rastreabilidade.png', 'Pacientes › Histórico › Registro de eventos (tela nova: autoria e horário)');
  await p.close();
  const m = await pagina('enfermeiro', { width: 390, height: 844, mobile: true });
  await ir(m, '/mobile', 2200); await foto(m, 'enfermeiro', '11_celular_triagem.png', 'Triagem no celular'); await m.close();
});

// ── Recepção: permissão negada (tela nova de eventos) ──
await tente('permissão negada', async () => {
  const r = await rec('GET', `/patients/${carla.id}/eventos`);
  manifesto.push({ nota: 'Recepção lendo /patients/:id/eventos', status_http: r.status });
  const p = await pagina('recepcionista'); await ir(p, '/main/pacientes'); await buscar(p, 'Carla');
  await passo(p, 'Visualizar', { dentro: 'Carla Dias', espera: 1200 }); await passo(p, 'Histórico', { parcial: true, espera: 1500 });
  await foto(p, 'recepcionista', '07_sem_registro_de_eventos_para_recepcao.png', `Recepção: a seção "Registro de eventos" não aparece (API devolve ${r.status})`);
  await p.close();
});

// ── Médico ──
await tente('médico', async () => {
  const p = await pagina('medico');
  await ir(p, '/main', 2800);
  await foto(p, 'medico', '01_painel_metricas.png', 'Painel de métricas');
  await passo(p, 'Carla Mendes', { parcial: true, espera: 1500 }); await p.eval(() => [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Paciente em foco')?.scrollIntoView({ block: 'start' })); await sleep(1200);
  await foto(p, 'medico', '01b_paciente_em_foco_grafico.png', 'Painel › Paciente em foco com gráfico de sinais vitais');
  await ir(p, '/main/alertas', 2200);
  await foto(p, 'medico', '02_esteira_medico.png', 'Esteira (médico)');
  await passo(p, 'Chamar', { dentro: 'Diego Alves', espera: 1500 });
  await foto(p, 'medico', '03_consulta_iniciada.png', 'Consulta iniciada (médico)');
  await passoRe(p, /Observação$/, { dentro: 'Diego Alves', espera: 1500 }).catch(() => {});
  await foto(p, 'medico', '04_observacao_liberar_alta.png', 'Paciente em observação com "Liberar Alta"');
  await passo(p, 'Chamar', { dentro: 'Gisele Prado', espera: 1500 });
  await passo(p, 'Alta', { dentro: 'Gisele Prado', espera: 1200 });
  await digitar(p, 'Medicamentos e Orientações', 'Paracetamol 500 mg se dor (texto fictício)');
  await digitar(p, 'Orientações à Equipe', 'Retornar se piorar (texto fictício)');
  await foto(p, 'medico', '05_janela_de_alta_guia_pdf.png', 'Janela de alta com guia em PDF');
  await passo(p, 'Exportar Guia e Dar Alta', { espera: 3500 });
  await ir(p, '/main/pacientes'); await marcarRadio(p, 'alta');
  await foto(p, 'medico', '06_lista_com_alta.png', 'Lista de pacientes com alta');
  await ir(p, '/main/pacientes'); await buscar(p, 'Carla'); await passo(p, 'Visualizar', { dentro: 'Carla Dias', espera: 1500 });
  await foto(p, 'medico', '07_prontuario.png', 'Prontuário');
  await passo(p, 'Histórico', { parcial: true, espera: 1500 });
  await foto(p, 'medico', '08_historico_e_registro_de_eventos.png', 'Histórico de visitas + Registro de eventos (autoria da cor, justificativa)');
  await esc(p);
  await ir(p, '/main/exportar');
  await p.eval(() => { const i = [...document.querySelectorAll('input')].find((x) => x.placeholder?.startsWith('Nome do paciente')); i?.focus(); });
  await p.send('Input.insertText', { text: 'Carla' }); await sleep(300);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await sleep(1500);
  await passo(p, 'Carla Dias Mendes', { parcial: true, espera: 1500 });
  await foto(p, 'medico', '09_exportar_prontuario.png', 'Exportar prontuário (PDF)');
  await passo(p, 'Prontuário', { espera: 3500 });
  await abrirConversa(p, 'Enfermeiro Teste');
  await foto(p, 'medico', '10_chat_interno.png', 'Chat interno (médico)');
  await p.close();
});

// Política de dados em PDF
await tente('pdf política', async () => { const p = await pagina('medico'); await ir(p, '/main/politica'); await passoRe(p, /Baixar PDF|Baixar Política/, { espera: 3000 }); await p.close(); });

fs.writeFileSync(`${PAC}/logs/manifesto_capturas.json`, JSON.stringify({ executado_em: new Date().toISOString(), itens: manifesto }, null, 2));
await fechar();
