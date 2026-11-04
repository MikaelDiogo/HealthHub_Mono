import { pagina, ir, digitar, escolherSexo, passo, passoRe, foto, sleep, url, texto, temTexto, registrar, horaBR, fechar, apiLogin, observarRede, admitirUI, caso, esc } from './lib.mjs';
const CPF = { A: '99999999901', B: '99999999902' };
const med = await apiLogin('medico');

// ── F02 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('recepcionista');
  const ev = await observarRede(p);
  await ir(p, '/main/pacientes');
  await passo(p, 'Adicionar Paciente');
  prints.push(await foto(p, 'F02_tela1.png'));
  // 1) cadastro vazio
  const n0 = ev.length;
  await passo(p, 'Salvar e Registrar', { espera: 1800 });
  const apos = ev.slice(n0).filter(e => e.url.startsWith('/patients'));
  const textoVazio = await texto(p);
  const avisoVazio = await p.eval(() => (document.querySelector('[data-aviso-erro]')?.textContent || document.querySelector('[class*="InputWrapper-error"]')?.textContent || '').trim());
  const mostrouErro = avisoVazio.length > 0;
  prints.push(await foto(p, 'F02_vazio.png'));
  obs.push(`Cadastro VAZIO: requisição POST /patients → status ${apos.map(a => a.status).join(',') || '(nenhuma requisição enviada)'}; modal ainda aberto=${await temTexto(p, 'Novo paciente')}; aviso visível na tela (aviso vermelho ou erro no campo Nome)=${mostrouErro} ("${avisoVazio.slice(0, 140)}")`);
  const vazioSilencioso = !mostrouErro;
  // 2) cadastro válido
  await digitar(p, 'Nome Completo', 'TESTE A — Silva');
  await digitar(p, 'CPF', CPF.A);
  await digitar(p, 'Idade', '34');
  await escolherSexo(p, 'Masculino');
  prints.push(await foto(p, 'F02_preenchido.png'));
  const n1 = ev.length;
  await passo(p, 'Salvar e Registrar', { espera: 2200 });
  const st = ev.slice(n1).filter(e => e.url.startsWith('/patients')).map(e => e.status);
  const lista = (await med('GET', '/patients')).data;
  const criado = lista.find(x => x.nome_completo === 'TESTE A — Silva');
  prints.push(await foto(p, 'F02_resultado.png'));
  obs.push(`Cadastro VÁLIDO: POST /patients → ${st.join(',')}; paciente no banco=${!!criado}${criado ? ` (idade ${criado.idade}, sexo ${criado.sexo}, ativo=${criado.ativo})` : ''}`);
  await p.close();
  const resultado = criado && vazioSilencioso === false ? 'APROVADO' : 'REPROVADO';
  registrar({ id: 'F02', perfil: 'Recepcionista', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado,
    notas: vazioSilencioso ? 'Cadastro vazio é recusado, mas a tela não mostra aviso ao usuário → REPROVADO.' : 'Tela mostrou aviso no cadastro vazio (a partir da regra do cadastro mínimo, o aviso é o erro do campo Nome: só o nome é obrigatório).' });
});
await fechar();
