// F18 (rodada 3) — pressão arterial no painel: PA 190/120 e depois 85/50 e 130/85. Esperado: Crítico, Crítico, Normal (Estado geral e cartão
// "Pressão arterial" do paciente em foco) e, na lista "atenção agora" (GET /metricas e tela), o motivo "PA 190/120", "PA 85/50" e ausência no terceiro caso.
// Paciente 100% fictício (TESTE F), cadastrado e admitido pela API; sinais lançados pelo enfermeiro pela API; estado lido NA TELA do médico.
import { pagina, ir, passo, foto, sleep, texto, registrar, horaBR, fechar, apiLogin, caso, criarPaciente } from './lib.mjs';

await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = []; let ok = true;
  const rec = await apiLogin('recepcionista'); const enf = await apiLogin('enfermeiro'); const med = await apiLogin('medico');
  const suf = String(Date.now()).slice(-5);
  const nome = `TESTE F ${suf}`;
  const p = (await criarPaciente(rec, nome, { cpf: String(80000000000 + Number(suf)).slice(0, 11), idade: 52, sexo: 'F' })).data;
  await rec('POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, chegada: `09:00 (${horaBR()})`, status: 'Aguardando Atendimento', motivo_visita: 'F18 pressão arterial (fictício)' });
  const base = { frequencia_cardiaca: 72, saturacao_oxigenio: 98, temperatura: 36.5 };
  const m = await pagina('medico');

  for (const [pa, estadoEsperado, critEsperado] of [['190/120', 'Crítico', true], ['85/50', 'Crítico', true], ['130/85', 'Estável', false]]) {
    await enf('POST', `/sinais/${p.id}`, { ...base, pressao_arterial: pa });
    await sleep(400);
    await ir(m, '/main', 2500);
    await passo(m, nome, { parcial: true, espera: 1800 });
    const t = (await texto(m)).replace(/\s+/g, ' ');
    const foco = (t.match(/Paciente em foco[\s\S]{0,60}/) || [''])[0];
    const cartaoPA = new RegExp(`Pressão arterial\\s*${pa.replace('/', '\\/')}\\s*mmHg\\s*(Crítico|Atenção|Normal)`).exec(t)?.[1] ?? null;
    const geral = /Estado geral\s*(Crítico|Atenção|Estável|Sem dados)/.exec(t)?.[1] ?? null;
    const lista = ((await med('GET', '/metricas')).data?.atencao ?? []).find((a) => a.paciente_id === p.id);
    const naListaApi = !!lista && lista.motivo.includes(`PA ${pa}`);
    const naListaTela = t.includes(`PA ${pa}`);
    const esperadoCartao = critEsperado ? 'Crítico' : 'Normal';
    const bate = geral === estadoEsperado && cartaoPA === esperadoCartao && naListaApi === critEsperado && naListaTela === critEsperado;
    if (!bate) ok = false;
    prints.push(await foto(m, `F18_PA_${pa.replace('/', '-')}.png`));
    obs.push(`PA ${pa}: Estado geral="${geral}" (esperado ${estadoEsperado}); cartão PA="${cartaoPA}" (esperado ${esperadoCartao}); na lista atenção (API)=${naListaApi}${lista ? ` [${lista.motivo}]` : ''}; na tela=${naListaTela}; ${bate ? 'confere' : 'NÃO confere'}`);
  }
  await m.close();
  registrar({ id: 'F18', perfil: 'Médico (tela) e Enfermeiro (sinais)', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: ok ? 'APROVADO' : 'REPROVADO',
    notas: 'Paciente fictício; sinais lançados pela API como enfermeiro; estado e lista lidos da tela do médico e de GET /metricas.' });
});
await fechar();
