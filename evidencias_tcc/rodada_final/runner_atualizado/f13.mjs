import { pagina, ir, passo, passoRe, digitar, foto, sleep, texto, temTexto, registrar, horaBR, fechar, apiLogin, caso, observarRede, mouse, clicar } from './lib.mjs';
const med = await apiLogin('medico');
const fila = async () => (await med('GET', '/fila')).data;
// Preparação (API): TESTE D vai para a Observação (para existir o botão "Liberar Alta")
{ const d = (await fila()).find(x => x.nome.startsWith('TESTE D'));
  await med('PUT', `/fila/${d.id}`, { status: 'Em Consulta (Médico)' }); await med('PUT', `/fila/${d.id}`, { status: 'Em Observação' }); }

// clica no botão com aria-label dentro do cartão que contém o texto âncora
const clicarAria = async (page, aria, ancora) => {
  const r = await page.eval(({ aria, ancora }) => {
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const anc = [...document.querySelectorAll('body *')].filter(el => vis(el) && el.childElementCount === 0 && el.textContent.trim().startsWith(ancora));
    for (const a0 of anc) { let a = a0; while (a && !a.matches('main,body,#root')) { const b = a.querySelector(`[aria-label="${aria}"]`); if (b && vis(b)) { b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } a = a.parentElement; } }
    return 'não encontrado: ' + aria;
  }, { aria, ancora });
  return mouse(page, r);
};
const temBotao = (page, re) => page.eval(({ s }) => [...document.querySelectorAll('button')].some(b => (b.offsetWidth || b.offsetHeight) && new RegExp(s).test(b.textContent.trim())), { s: re });
const temAria = (page, aria) => page.eval(({ aria }) => [...document.querySelectorAll(`[aria-label="${aria}"]`)].some(b => b.offsetWidth || b.offsetHeight), { aria });
const chamadasErro = (ev, n) => ev.slice(n).filter(e => e.status !== 204 && e.status !== 200 && e.status !== 201).map(e => `${e.url.split('?')[0].replace(/\/[0-9a-f-]{36}/g, '/:id')} ${e.status}`);
const MENSAGEM = /permiss|proibid|forbidden|negad|n[aã]o autorizado|n[aã]o tem acesso|403/i;

await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = []; const falhas = [];

  // 1) Recepção: Editar paciente
  { const p = await pagina('recepcionista'); const ev = await observarRede(p);
    await ir(p, '/main/pacientes');
    const botao = await temBotao(p, '^Editar$');
    obs.push(`RECEPÇÃO: botão "Editar" visível nos cartões=${botao}`);
    if (botao) {
      await passo(p, 'Editar', { dentro: 'TESTE C', espera: 1500 });
      await digitar(p, 'Endereço', 'Rua Fictícia, 100');
      const n = ev.length;
      await passo(p, 'Salvar Alterações', { espera: 2000 });
      const c = chamadasErro(ev, n);
      const msg = MENSAGEM.test(await texto(p));
      prints.push(await foto(p, 'F13_recepcao_editar.png'));
      obs.push(`  → salvar edição: respostas não-sucesso ${c.join('; ') || '(nenhuma)'}; mensagem de permissão visível=${msg}`);
      if (c.some(x => x.endsWith('403'))) falhas.push('Recepção vê "Editar" mas o backend recusa (403)');
    }
    await p.close(); }

  // 2) Enfermeiro: Liberar Alta (Observação)
  { const p = await pagina('enfermeiro'); const ev = await observarRede(p);
    await ir(p, '/main/alertas');
    const botao = await temBotao(p, '^Liberar Alta$');
    obs.push(`ENFERMEIRO: botão "Liberar Alta" visível na Observação=${botao}`);
    if (botao) {
      const n = ev.length;
      await passo(p, 'Liberar Alta', { dentro: 'TESTE D', espera: 2000 });
      const c = chamadasErro(ev, n); const noFila = (await fila()).some(x => x.nome.startsWith('TESTE D'));
      prints.push(await foto(p, 'F13_enfermeiro_liberar_alta.png'));
      obs.push(`  → clique: respostas não-sucesso ${c.join('; ') || '(nenhuma)'}; TESTE D continua na esteira=${noFila}; mensagem de permissão visível=${MENSAGEM.test(await texto(p))}`);
      if (c.some(x => x.endsWith('403'))) falhas.push('Enfermeiro vê "Liberar Alta" mas o backend recusa (403)');
      else if (!noFila) falhas.push('Enfermeiro conseguiu dar alta (comportamento diferente do documentado) — ver regra a alinhar');
    }
    // 3a) Enfermeiro: × remover
    const x = await temAria(p, 'Remover da esteira');
    obs.push(`ENFERMEIRO: botão × "Remover da esteira" visível=${x}`);
    if (x) {
      const n = ev.length;
      await clicarAria(p, 'Remover da esteira', 'TESTE F'); await sleep(2000);
      const c = chamadasErro(ev, n); const fNoFila = (await fila()).some(y => y.nome.startsWith('TESTE F'));
      prints.push(await foto(p, 'F13_enfermeiro_remover.png'));
      obs.push(`  → clique no × em TESTE F: respostas não-sucesso ${c.join('; ') || '(nenhuma)'}; TESTE F continua na esteira=${fNoFila}; mensagem visível=${MENSAGEM.test(await texto(p))}`);
      if (c.some(y => y.endsWith('403'))) falhas.push('Enfermeiro vê o × de remover mas o backend recusa (403)');
      else if (!fNoFila) falhas.push('Enfermeiro conseguiu remover da esteira');
    }
    await p.close(); }

  // 3b) Recepção: × remover
  { const p = await pagina('recepcionista'); const ev = await observarRede(p);
    await ir(p, '/main/alertas');
    const x = await temAria(p, 'Remover da esteira');
    obs.push(`RECEPÇÃO: botão × "Remover da esteira" visível=${x}`);
    if (x) {
      const n = ev.length;
      await clicarAria(p, 'Remover da esteira', 'TESTE F'); await sleep(2000);
      const c = chamadasErro(ev, n); const fNoFila = (await fila()).some(y => y.nome.startsWith('TESTE F'));
      prints.push(await foto(p, 'F13_recepcao_remover.png'));
      obs.push(`  → clique no × em TESTE F: respostas não-sucesso ${c.join('; ') || '(nenhuma)'}; TESTE F continua na esteira=${fNoFila}; mensagem visível=${MENSAGEM.test(await texto(p))}`);
      if (c.some(y => y.endsWith('403'))) falhas.push('Recepção vê o × de remover mas o backend recusa (403)');
      else if (!fNoFila) falhas.push('Recepção conseguiu remover da esteira');
    }
    await p.close(); }

  // Controle positivo: o médico continua vendo os botões que os demais perfis não veem
  { const p = await pagina('medico');
    await ir(p, '/main/alertas');
    const liberar = await temBotao(p, '^Liberar Alta$'); const remover = await temAria(p, 'Remover da esteira');
    await ir(p, '/main/pacientes'); const editar = await temBotao(p, '^Editar$');
    prints.push(await foto(p, 'F13_medico_controle.png'));
    obs.push(`MÉDICO (controle): vê "Liberar Alta"=${liberar}, × remover=${remover}, "Editar"=${editar}`);
    if (!(liberar && remover && editar)) falhas.push('Médico deixou de ver algum botão que deveria ver');
    await p.close(); }
  // Defesa em profundidade: o backend continua recusando mesmo sem o botão
  { const enfApi = await apiLogin('enfermeiro'); const recApi = await apiLogin('recepcionista');
    const alvo = (await fila())[0]; const pac = (await med('GET', '/patients')).data[0];
    const r1 = await enfApi('PATCH', `/fila/${alvo.id}/alta`); const r2 = await enfApi('DELETE', `/fila/${alvo.id}`);
    const r3 = await recApi('DELETE', `/fila/${alvo.id}`); const r4 = await recApi('PUT', `/patients/${pac.id}`, { endereco: 'Rua Fictícia, 1' });
    obs.push(`API direta (sem botão): enfermeiro alta=${r1.status}, enfermeiro remover=${r2.status}, recepção remover=${r3.status}, recepção editar=${r4.status}`);
    if (![r1, r2, r3, r4].every(r => r.status === 403)) falhas.push('Backend deixou de recusar alguma ação (esperado 403)'); }

  registrar({ id: 'F13', perfil: 'Cada perfil', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: falhas.length ? 'REPROVADO' : 'APROVADO',
    notas: `Desvios: ${falhas.join('; ') || 'nenhum'}. Preparação via API: TESTE D movido para a Observação. CRITÉRIO A ALINHAR (registrar à parte, não substitui o REPROVADO): quem deve poder dar alta da observação e remover da esteira ainda não foi definido com o orientador.` });
});
await fechar();
