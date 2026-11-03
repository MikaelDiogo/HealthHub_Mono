import { pagina, ir, passo, foto, sleep, texto, registrar, horaBR, fechar, apiLogin, caso, clicar } from './lib.mjs';
const med = await apiLogin('medico'); const rec = await apiLogin('recepcionista'); const enf = await apiLogin('enfermeiro');
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const listaFila = async () => (await med('GET', '/fila')).data;

// Preparação (API): pacientes C, D, E criados, admitidos em ordem e com sinais-base normais
const novos = [
  ['TESTE C — Lima', '99999999903', 52, 'M', 'PR-004'],
  ['TESTE D — Alves', '99999999904', 78, 'F', 'PR-005'],
  ['TESTE E — Rocha', '99999999905', 45, 'M', 'PR-006'],
];
for (const [nome, cpf, idade, sexo, senha] of novos) {
  const c = await rec('POST', '/patients', { nome_completo: nome, cpf, idade, sexo });
  if (c.status !== 201) throw new Error('preparação ' + nome + ' ' + c.status + JSON.stringify(c.data));
  await enf('POST', `/sinais/${c.data.id}`, { saturacao_oxigenio: 97, frequencia_cardiaca: 80, temperatura: 36.5, pressao_arterial: '120/80' });
  const a = await rec('POST', '/fila', { paciente_id: c.data.id, nome, idade, senha, chegada: brt(), status: 'Aguardando Triagem' });
  if (a.status !== 201) throw new Error('admissão ' + nome + ' ' + a.status);
  await new Promise(r => setTimeout(r, 1200));
}

await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('enfermeiro');
  await ir(p, '/main/alertas');
  const plano = [['TESTE B', 'Vermelho'], ['TESTE C', 'Verde'], ['TESTE D', 'Laranja'], ['TESTE E', 'Amarelo']];
  for (const [nome, cor] of plano) {
    await passo(p, 'Iniciar Triagem', { dentro: nome, espera: 1300 });
    const r = await passo(p, cor, { dentro: nome, parcial: true, espera: 1500 });
    if (r !== 'ok') throw new Error(`classificar ${nome} ${cor}: ${r}`);
  }
  await p.close();

  // Ordem devolvida pelo backend (GET /fila) — é a que a esteira e o /mobile consomem
  const f = await listaFila();
  const ordemApi = f.map(x => `${x.nome.slice(0, 7)}(${x.gravidade ?? 'sem cor'},${x.status.split(' ')[0]})`);
  obs.push(`Admissão: A(1º) B(2º) F(3º) C(4º) D(5º) E(6º). Cores: A=Azul, B=Vermelho, C=Verde, D=Laranja, E=Amarelo, F=sem classificação (bloqueada no F08).`);
  obs.push(`Ordem do backend GET /fila: ${ordemApi.join(' → ')}`);

  // Esteira desktop
  const d = await pagina('medico');
  await ir(d, '/main/alertas');
  prints.push(await foto(d, 'F10_desktop.png'));
  const ordemDesktop = await d.eval(() => {
    const cols = [...document.querySelectorAll('h2')].map(h => h.closest('div[class*=Paper], .mantine-Paper-root') || h.parentElement.parentElement);
    return cols.map(c => ({ titulo: c.querySelector('h2')?.textContent, itens: [...c.querySelectorAll('p')].map(x => x.textContent.trim()).filter(t => /^TESTE [A-Z]/.test(t)).map(t => t.slice(0, 7)) }));
  });
  obs.push(`Esteira desktop (ordem em cada coluna): ${ordemDesktop.map(c => `${c.titulo}: ${c.itens.join(' → ')}`).join(' | ')}`);
  await d.close();

  // /mobile
  const m = await pagina('enfermeiro', { width: 390, height: 844, mobile: true });
  await ir(m, '/mobile', 2200);
  prints.push(await foto(m, 'F10_mobile.png'));
  const ordemMobile = await m.eval(() => [...document.querySelectorAll('p,div,span')].filter(e => e.childElementCount === 0 && /^TESTE [A-Z] —/.test(e.textContent.trim())).map(e => e.textContent.trim().slice(0, 7)));
  obs.push(`/mobile (ordem na tela): ${ordemMobile.join(' → ')}`);
  await m.close();

  const esperadoClassificados = ['TESTE B', 'TESTE D', 'TESTE E', 'TESTE C', 'TESTE A'];
  const classif = f.filter(x => x.gravidade).map(x => x.nome.slice(0, 7));
  const idxF = f.findIndex(x => !x.gravidade);
  const idxPrimeiroClassif = f.findIndex(x => x.gravidade);
  const classificadosOk = JSON.stringify(classif) === JSON.stringify(esperadoClassificados);
  const semCorNaFrente = idxF >= 0 && idxF < idxPrimeiroClassif;
  const mobileOk = JSON.stringify(ordemMobile.filter(n => esperadoClassificados.includes(n))) === JSON.stringify(esperadoClassificados);
  obs.push(`Classificados na ordem esperada (V>L>Am>Vd>Az)=${classificadosOk}; paciente SEM classificação à frente do Vermelho no backend=${semCorNaFrente}; /mobile em ordem=${mobileOk}`);
  const reprovado = !classificadosOk || semCorNaFrente || !mobileOk;
  registrar({ id: 'F10', perfil: 'Enfermeiro + Médico', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: reprovado ? 'REPROVADO' : 'APROVADO',
    notas: 'Preparação via API (marcada): pacientes C, D, E criados/admitidos com sinais-base normais. Classificação feita pela interface. A versão testada inclui a correção do /mobile (Laranja/Azul) feita em 28/10, ainda não commitada.' });
});
await fechar();
