import { pagina, ir, digitar, passo, passoRe, foto, sleep, texto, temTexto, registrar, horaBR, fechar, apiLogin, observarRede, admitirUI, caso, esc } from './lib.mjs';
const med = await apiLogin('medico'); const rec = await apiLogin('recepcionista');
const achar = async (nome) => (await med('GET', '/patients')).data.find(x => x.nome_completo === nome);
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

// ── F03 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('enfermeiro'); const ev = await observarRede(p);
  await ir(p, '/main/pacientes');
  await passo(p, 'Adicionar Paciente');
  prints.push(await foto(p, 'F03_tela1.png'));
  await digitar(p, 'Nome Completo', 'TESTE B — Souza'); await digitar(p, 'CPF', '99999999902');
  await digitar(p, 'Idade', '67'); await digitar(p, 'Sexo', 'F');
  const rt = await passo(p, 'Hospitalares', { parcial: true });
  await digitar(p, 'Temperatura', '37.9'); await digitar(p, 'SpO', '94'); await digitar(p, 'Pressão', '140/90'); await digitar(p, 'FC', '95');
  await digitar(p, 'Alergias', 'Nenhuma conhecida (fictício)'); await digitar(p, 'Medicamentos', 'Nenhum (fictício)');
  prints.push(await foto(p, 'F03_sinais.png'));
  const n = ev.length;
  await passo(p, 'Salvar e Registrar', { espera: 2500 });
  const calls = ev.slice(n).filter(e => e.status !== 204).map(e => `${e.url} ${e.status}`);
  const b = await achar('TESTE B — Souza'); const v = b ? (await med('GET', `/patients/${b.id}`)).data.sinaisVitais : [];
  prints.push(await foto(p, 'F03_resultado.png'));
  const l = v?.[0];
  obs.push(`Aba Hospitalares aberta (${rt}); chamadas: ${calls.join('; ')}; paciente criado=${!!b}; leituras de sinais=${v?.length ?? 0}${l ? ` → SpO2 ${l.saturacao_oxigenio}, FC ${l.frequencia_cardiaca}, Temp ${l.temperatura}, PA ${l.pressao_arterial}` : ''}; alergias="${b?.alergias}"`);
  await p.close();
  const ok = b && v.length >= 1 && String(l.saturacao_oxigenio) == '94' && String(l.frequencia_cardiaca) == '95' && Number(l.temperatura) === 37.9 && l.pressao_arterial === '140/90';
  registrar({ id: 'F03', perfil: 'Enfermeiro', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado: ok ? 'APROVADO' : 'REPROVADO', notas: '' });
});

// ── F04 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('enfermeiro'); const ev = await observarRede(p);
  await ir(p, '/main/pacientes');
  const b = await achar('TESTE B — Souza');
  const antes = (await med('GET', `/patients/${b.id}`)).data.sinaisVitais.length;
  await passo(p, 'Editar', { dentro: 'TESTE B' });
  await passo(p, 'Sinais', { parcial: true });
  await digitar(p, 'Temperatura', '46');
  prints.push(await foto(p, 'F04_tela1.png'));
  const n = ev.length;
  await passo(p, 'Salvar Alterações', { espera: 2200 });
  const st1 = ev.slice(n).filter(e => e.status !== 204).map(e => `${e.url} ${e.status}`);
  const d1 = (await med('GET', `/patients/${b.id}`)).data.sinaisVitais;
  const gravou46 = d1.some(x => Number(x.temperatura) === 46);
  const aberto = await temTexto(p, 'Editar prontuário');
  prints.push(await foto(p, 'F04_recusa.png'));
  const avisoF04 = await p.eval(() => document.querySelector('[data-aviso-erro]')?.textContent?.trim() ?? '');
  obs.push(`Aviso vermelho ao recusar 46 °C: "${avisoF04.slice(0, 140)}"`); obs.push(`Temp 46 °C: chamadas ${st1.join('; ') || '(nenhuma)'}; leituras antes=${antes}, depois=${d1.length}; valor 46 gravado=${gravou46}; modal ainda aberto=${aberto}`);
  if (!aberto) { await passo(p, 'Editar', { dentro: 'TESTE B' }); await passo(p, 'Sinais', { parcial: true }); }
  await digitar(p, 'Temperatura', '37.9');
  const n2 = ev.length;
  await passo(p, 'Salvar Alterações', { espera: 2200 });
  const st2 = ev.slice(n2).filter(e => e.status !== 204).map(e => `${e.url} ${e.status}`);
  const d2 = (await med('GET', `/patients/${b.id}`)).data.sinaisVitais;
  prints.push(await foto(p, 'F04_valido.png'));
  obs.push(`Temp 37,9 °C (válido): chamadas ${st2.join('; ') || '(nenhuma)'}; leituras=${d2.length}; última temp=${d2[0]?.temperatura}`);
  await p.close();
  registrar({ id: 'F04', perfil: 'Enfermeiro', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: !gravou46 && d2.length > d1.length ? 'APROVADO' : 'REPROVADO', notas: avisoF04 ? 'A tela mostrou o motivo da recusa.' : 'SEM AVISO NA TELA ao recusar o valor.' });
});

// ── F05 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('recepcionista');
  await ir(p, '/main/alertas');
  prints.push(await foto(p, 'F05_tela1.png'));
  const a = await admitirUI(p, 'TESTE A — Silva', 'Dor lombar após esforço');
  prints.push(await foto(p, 'F05_admitirA.png'));
  const b = await admitirUI(p, 'TESTE B — Souza', 'Mal-estar e tontura');
  prints.push(await foto(p, 'F05_admitirB.png'));
  await esc(p);
  prints.push(await foto(p, 'F05_esteira.png'));
  const f = (await med('GET', '/fila')).data;
  const fa = f.find(x => x.nome === 'TESTE A — Silva'), fb = f.find(x => x.nome === 'TESTE B — Souza');
  obs.push(`Senha mostrada no modal: A=${a.senha}, B=${b.senha}; senha gravada: A=${fa?.senha}, B=${fb?.senha}; status A=${fa?.status}, B=${fb?.status}; chegada A="${fa?.chegada}", B="${fb?.chegada}" (hora atual BRT ${brt()}); entradas na fila=${f.length}`);
  await p.close();
  const ok = fa?.senha === 'PR-001' && fb?.senha === 'PR-002' && fa.status === 'Aguardando Triagem' && fb.status === 'Aguardando Triagem' && f.length === 2;
  registrar({ id: 'F05', perfil: 'Recepcionista', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado: ok ? 'APROVADO' : 'REPROVADO',
    notas: 'Fila inicialmente vazia: esperado PR-001 e PR-002. A árvore testada inclui a correção de senha sequencial feita em 28/10 (proximaSenha), ainda não commitada.' });
});

// ── F06 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const a = await achar('TESTE A — Silva');
  const r = await rec('POST', '/fila', { paciente_id: a.id, nome: a.nome_completo, idade: a.idade, senha: 'PR-099', chegada: '29/10/2026, 09:40', status: 'Aguardando Triagem' });
  const f = (await med('GET', '/fila')).data;
  obs.push(`API direta (POST /fila com TESTE A já na fila): HTTP ${r.status} ${JSON.stringify(r.data)}; entradas de TESTE A na fila=${f.filter(x => x.nome === 'TESTE A — Silva').length}`);
  const p = await pagina('recepcionista');
  await ir(p, '/main/alertas');
  await passo(p, 'Admitir Paciente');
  await digitar(p, 'Nome ou CPF', 'TESTE A');
  await sleep(700);
  const listado = await p.eval(() => [...document.querySelectorAll('[role=option]')].some(o => o.textContent.includes('TESTE A')));
  prints.push(await foto(p, 'F06_modal_busca.png'));
  obs.push(`Interface: TESTE A aparece como opção no modal de admissão=${listado}`);
  await p.close();
  const ok = r.status >= 400 && r.status < 500 && /j[aá] est[aá] na fila/i.test(JSON.stringify(r.data)) && f.filter(x => x.nome === 'TESTE A — Silva').length === 1;
  registrar({ id: 'F06', perfil: 'Recepcionista', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado: ok ? 'APROVADO' : 'REPROVADO',
    notas: 'A interface impede a duplicidade ao não listar o paciente; a recusa com mensagem foi comprovada chamando a API diretamente (a tela não oferece o caminho, então não há print da mensagem).' });
});
await fechar();
