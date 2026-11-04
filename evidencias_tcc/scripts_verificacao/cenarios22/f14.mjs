import { pagina, ir, passo, digitar, foto, sleep, texto, registrar, horaBR, fechar, apiLogin, caso, observarRede } from './lib.mjs';
const med = await apiLogin('medico');
const atencao = async () => (await med('GET', '/metricas')).data.atencao;

async function lancarSinais(p, nome, v) {
  await ir(p, '/main/pacientes');
  await passo(p, 'Editar', { dentro: nome, espera: 1500 });
  await passo(p, 'Sinais', { parcial: true });
  await digitar(p, 'Temperatura', v.temp); await digitar(p, 'SpO', v.spo2); await digitar(p, 'Pressão', v.pa); await digitar(p, 'FC', v.fc);
  await passo(p, 'Salvar Alterações', { espera: 2200 });
}

await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const enf = await pagina('enfermeiro');
  const antes = await atencao();
  obs.push(`Antes de lançar: lista de atenção = [${antes.map(a => `${a.nome.slice(0, 7)}:${a.nivel}`).join(', ') || 'vazia'}]`);

  await lancarSinais(enf, 'TESTE C', { temp: '38.6', spo2: '91', pa: '100/60', fc: '110' });
  const m = await pagina('medico');
  await ir(m, '/main', 2500);
  prints.push(await foto(m, 'F14_painel_apos_C.png'));
  const a1 = await atencao();
  obs.push(`Após TESTE C (SpO2 91, FC 110, Temp 38,6): atenção = [${a1.map(a => `${a.nome.slice(0, 7)}:${a.nivel}(${a.motivo})`).join('; ')}]`);

  await lancarSinais(enf, 'TESTE D', { temp: '36.0', spo2: '97', pa: '110/70', fc: '55' });
  await lancarSinais(enf, 'TESTE E', { temp: '38.5', spo2: '92', pa: '130/85', fc: '88' });
  await enf.close();

  await ir(m, '/main', 2500);
  prints.push(await foto(m, 'F14_painel_final.png'));
  const a2 = await atencao();
  obs.push(`Após TESTE D (FC 55) e TESTE E (SpO2 92, Temp 38,5): atenção = [${a2.map(a => `${a.nome.slice(0, 7)}:${a.nivel}(${a.motivo})`).join('; ')}]`);

  // Fronteira no cartão do paciente em foco (TESTE E)
  await passo(m, 'TESTE E — Rocha', { parcial: true, espera: 1500 });
  const estadoE = await m.eval(() => document.body.innerText);
  prints.push(await foto(m, 'F14_foco_E_fronteira.png'));
  const trecho = (estadoE.match(/Paciente em foco[\s\S]{0,420}/) || [''])[0].replace(/\s+/g, ' ');
  obs.push(`Paciente em foco TESTE E: "${trecho.slice(0, 260)}"`);
  await m.close();

  const nivel = (arr, n) => arr.find(a => a.nome.startsWith(n))?.nivel;
  const cCritico = nivel(a2, 'TESTE C') === 'critico';
  const dCritico = nivel(a2, 'TESTE D') === 'critico';
  const eNaoCritico = nivel(a2, 'TESTE E') !== 'critico';
  const eEstadoUi = /Aten[cç][aã]o/.test(trecho) && !/Cr[ií]tico/.test(trecho.replace(/Estado geral/, ''));
  obs.push(`Verificação: C crítico=${cCritico}; D crítico=${dCritico}; E NÃO crítico=${eNaoCritico}; cartão de E mostra "Atenção" e não "Crítico"=${eEstadoUi}`);
  registrar({ id: 'F14', perfil: 'Médico ou Enfermeiro', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: cCritico && dCritico && eNaoCritico && eEstadoUi ? 'APROVADO' : 'REPROVADO',
    notas: 'Sinais lançados pela interface (enfermeiro), valores dos casos C03/C04/C05 do roteiro. Lista "Atenção agora" lida do Painel (print) e de GET /metricas.' });
});
await fechar();
