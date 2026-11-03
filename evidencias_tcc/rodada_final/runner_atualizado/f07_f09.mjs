import fs from 'node:fs';
import { pagina, ir, digitar, passo, passoRe, foto, sleep, texto, temTexto, registrar, horaBR, fechar, apiLogin, observarRede, admitirUI, caso, esc } from './lib.mjs';
const med = await apiLogin('medico'); const rec = await apiLogin('recepcionista');
const fila = async () => (await med('GET', '/fila')).data;
const entrada = async (nome) => (await fila()).find(x => x.nome.startsWith(nome));

// (rodada 2: a nota do F04 é registrada no próprio caso F04)

// ── F07 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('enfermeiro'); const ev = await observarRede(p);
  await ir(p, '/main/alertas');
  prints.push(await foto(p, 'F07_tela1.png'));
  const r = await passo(p, 'Iniciar Triagem', { dentro: 'TESTE A', espera: 1500 });
  const a = await entrada('TESTE A');
  prints.push(await foto(p, 'F07_resultado.png'));
  obs.push(`Clique em Iniciar Triagem no cartão do TESTE A (${r}); status no banco="${a?.status}"; PUT /fila → ${ev.filter(e => e.url.startsWith('/fila') && e.status !== 204).map(e => e.status).join(',')}`);
  await p.close();
  registrar({ id: 'F07', perfil: 'Enfermeiro', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado: a?.status === 'Em Triagem (Enfermeiro)' ? 'APROVADO' : 'REPROVADO', notas: '' });
});

// ── F08 ── (TESTE F: cadastro pela recepção e admissão pela interface)
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const pr = await pagina('recepcionista');
  await ir(pr, '/main/pacientes'); await passo(pr, 'Adicionar Paciente');
  await digitar(pr, 'Nome Completo', 'TESTE F — Pires'); await digitar(pr, 'CPF', '99999999906'); await digitar(pr, 'Idade', '29'); await digitar(pr, 'Sexo', 'F');
  await passo(pr, 'Salvar e Registrar', { espera: 2000 });
  await ir(pr, '/main/alertas');
  const adm = await admitirUI(pr, 'TESTE F — Pires', 'Dor de cabeça');
  await pr.close();
  const f = await entrada('TESTE F');
  const semSinais = ((await med('GET', `/patients/${(await med('GET', '/patients')).data.find(x => x.nome_completo.startsWith('TESTE F')).id}`)).data.sinaisVitais || []).length === 0;
  obs.push(`TESTE F cadastrado e admitido pela interface (senha ${f?.senha}); sem sinais vitais=${semSinais}`);

  const p = await pagina('enfermeiro'); const ev = await observarRede(p);
  await ir(p, '/main/alertas');
  await passo(p, 'Iniciar Triagem', { dentro: 'TESTE F', espera: 1500 });
  prints.push(await foto(p, 'F08_tela1.png'));
  const n = ev.length;
  const rc = await passo(p, 'Amarelo', { dentro: 'TESTE F', parcial: true, espera: 1800 });
  const chamadas = ev.slice(n).filter(e => e.status !== 204).map(e => `${e.url.split('/')[1]} ${e.status}`);
  const f2 = await entrada('TESTE F');
  const msgVisivel = await temTexto(p, 'Registre os sinais vitais');
  prints.push(await foto(p, 'F08_bloqueio.png'));
  obs.push(`Clique numa cor (Amarelo) no TESTE F sem sinais (${rc}): chamadas ${chamadas.join('; ') || '(nenhuma)'}; gravidade no banco=${f2?.gravidade ?? 'null'}; status=${f2?.status}; mensagem "Registre os sinais vitais…" visível na tela=${msgVisivel}`);
  await p.close();
  const bloqueou = !f2?.gravidade && chamadas.some(c => c.endsWith('400'));
  registrar({ id: 'F08', perfil: 'Enfermeiro', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: bloqueou && msgVisivel ? 'APROVADO' : 'REPROVADO',
    notas: bloqueou ? (msgVisivel ? 'Backend bloqueou e a mensagem apareceu.' : 'Backend bloqueou (400) e a cor não foi gravada, mas a mensagem NÃO apareceu para o usuário (ver print) — o esperado do roteiro inclui a mensagem.') : 'Bloqueio não ocorreu como esperado.' });
});

// ── F09 ── (TESTE A recebe sinais pela interface e é classificado)
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('enfermeiro'); const ev = await observarRede(p);
  await ir(p, '/main/pacientes');
  await passo(p, 'Editar', { dentro: 'TESTE A' }); await passo(p, 'Sinais', { parcial: true });
  await digitar(p, 'Temperatura', '36.5'); await digitar(p, 'SpO', '98'); await digitar(p, 'Pressão', '120/80'); await digitar(p, 'FC', '72');
  prints.push(await foto(p, 'F09_sinais.png'));
  await passo(p, 'Salvar Alterações', { espera: 2200 });
  await ir(p, '/main/alertas');
  prints.push(await foto(p, 'F09_tela1.png'));
  const n = ev.length;
  const rc = await passo(p, 'Azul', { dentro: 'TESTE A', parcial: true, espera: 1800 });
  const a = await entrada('TESTE A');
  prints.push(await foto(p, 'F09_resultado.png'));
  obs.push(`Sinais lançados pela interface (SpO2 98, FC 72, Temp 36,5, PA 120/80); cor escolhida=Azul (${rc}); banco: gravidade="${a?.gravidade}", status="${a?.status}"; chamadas ${ev.slice(n).filter(e => e.status !== 204).map(e => e.status).join(',')}`);
  await p.close();
  registrar({ id: 'F09', perfil: 'Enfermeiro', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: a?.gravidade === 'Azul' && a?.status === 'Aguardando Atendimento' ? 'APROVADO' : 'REPROVADO', notas: 'Cor escolhida pelo executor: Azul (decisão do teste, sem valor clínico).' });
});
await fechar();
