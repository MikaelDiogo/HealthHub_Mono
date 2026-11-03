import { pagina, ir, passo, digitar, foto, sleep, texto, enter, registrar, horaBR, fechar, apiLogin, caso } from './lib.mjs';
const med = await apiLogin('medico');

await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const e = await pagina('enfermeiro'); const m = await pagina('medico');
  await ir(e, '/chat', 2200);

  // Enfermeiro abre uma conversa direta com o médico e envia mensagem normal
  await passo(e, 'Nova mensagem', { espera: 1000 });
  await passo(e, 'Dr. João Silva', { parcial: true, espera: 1500 });
  await digitar(e, 'Mensagem para', 'Bom dia, doutor. Teste de chat (mensagem normal).');
  await enter(e); await sleep(1200);
  prints.push(await foto(e, 'F15_enfermeiro_normal.png'));

  // Médico abre o chat (já com a conversa) e responde
  await ir(m, '/chat', 2200);
  prints.push(await foto(m, 'F15_medico_lista.png'));
  await passo(m, 'Enfermeiro Teste', { parcial: true, espera: 1500 });
  const recebeuNormal = (await texto(m)).includes('Teste de chat (mensagem normal)');
  obs.push(`Médico viu a mensagem normal do enfermeiro ao abrir a conversa=${recebeuNormal}`);
  await digitar(m, 'Mensagem para', 'Bom dia. Recebi a mensagem (resposta do médico).');
  await enter(m); await sleep(1500);

  // Tempo real: sem recarregar, o enfermeiro deve ver a resposta
  const enfViuResposta = (await texto(e)).includes('resposta do médico');
  obs.push(`Enfermeiro viu a resposta do médico em tempo real (sem recarregar)=${enfViuResposta}`);

  // Mensagem URGENTE do enfermeiro, com a conversa já aberta no médico
  await passo(e, 'Marcar como urgente', { parcial: true, espera: 600 });
  await digitar(e, 'Mensagem urgente para', 'URGENTE: TESTE C com SpO2 91, favor reavaliar.');
  prints.push(await foto(e, 'F15_enfermeiro_urgente_digitando.png'));
  await enter(e); await sleep(1800);
  prints.push(await foto(e, 'F15_enfermeiro_urgente.png'));
  const tm = await texto(m);
  const medViu = tm.includes('TESTE C com SpO2 91');
  const medUrgente = /Urgente/.test(tm);
  prints.push(await foto(m, 'F15_medico_urgente.png'));
  obs.push(`Médico recebeu a mensagem urgente em tempo real=${medViu}; marcação "Urgente" visível no médico=${medUrgente}`);

  // Verdade no banco (via API do médico)
  const convs = (await med('GET', '/chat/conversations')).data;
  const dm = convs.find(c => (c.conversation?.type ?? c.type) === 'direct');
  const id = dm.conversation?.id ?? dm.id;
  const msgs = (await med('GET', `/chat/conversations/${id}/messages`)).data;
  obs.push(`API: ${msgs.length} mensagens na conversa; prioridades=[${msgs.map(x => x.priority).join(', ')}]; remetentes=[${msgs.map(x => x.sender_role).join(', ')}]`);
  await e.close(); await m.close();
  const ok = recebeuNormal && enfViuResposta && medViu && medUrgente && msgs.length === 3 && msgs[2].priority === 'urgente' && msgs[0].priority === 'normal';
  registrar({ id: 'F15', perfil: 'Dois perfis', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado: ok ? 'APROVADO' : 'REPROVADO',
    notas: 'Duas sessões de navegador simultâneas (médico e enfermeiro). Nomes nos prints: usuários do seed do banco de teste (Dr. João Silva — seed fictício; Enfermeiro Teste — renomeado no banco de teste).' });
});
await fechar();
