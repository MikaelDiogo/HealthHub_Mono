import { pagina, ir, passo, passoRe, digitar, foto, sleep, texto, registrar, horaBR, fechar, apiLogin, caso, admitirUI, esc } from './lib.mjs';
const med = await apiLogin('medico');
const fila = async () => (await med('GET', '/fila')).data;
const atencao = async () => (await med('GET', '/metricas')).data.atencao;
const mmss = (ms) => { const s = Math.round(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const hms = (t) => new Date(t).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });

// Preparação (API, marcada): esteira limpa — todos recebem alta para voltarem como retorno pela interface
for (const f of await fila()) await med('PATCH', `/fila/${f.id}/alta`);
const vazia = (await fila()).length === 0;
console.log('Esteira limpa:', vazia);

const CASOS = [
  { id: 'C01', nome: 'TESTE A — Silva', queixa: 'Dor lombar após esforço', v: { spo2: '98', fc: '72', temp: '36.5', pa: '120/80' }, cor: 'Azul', esperadoPainel: { critico: false, estado: 'Estável' } },
  { id: 'C02', nome: 'TESTE B — Souza', queixa: 'Mal-estar e tontura', v: { spo2: '94', fc: '95', temp: '37.9', pa: '140/90' }, cor: 'Amarelo', esperadoPainel: { critico: false, estado: 'Atenção' } },
  { id: 'C03', nome: 'TESTE C — Lima', queixa: 'Falta de ar e febre', v: { spo2: '91', fc: '110', temp: '38.6', pa: '100/60' }, cor: 'Vermelho', esperadoPainel: { critico: true, estado: 'Crítico' } },
  { id: 'C04', nome: 'TESTE D — Alves', queixa: 'Fraqueza', v: { spo2: '97', fc: '55', temp: '36.0', pa: '110/70' }, cor: 'Laranja', esperadoPainel: { critico: true, estado: 'Crítico' } },
  { id: 'C05', nome: 'TESTE E — Rocha', queixa: 'Febre desde ontem', v: { spo2: '92', fc: '88', temp: '38.5', pa: '130/85' }, cor: 'Amarelo', esperadoPainel: { critico: false, estado: 'Atenção' } },
];

const rec = await pagina('recepcionista'); const enf = await pagina('enfermeiro'); const medp = await pagina('medico');

for (const c of CASOS) {
  await caso(async () => {
    const prints = []; const obs = []; const desvios = [];
    const ini = horaBR();
    const curto = c.nome.slice(0, 7);

    // 1) Recepção admite (retorno) com a queixa
    await ir(rec, '/main/alertas');
    const adm = await admitirUI(rec, c.nome, c.queixa);
    await esc(rec);
    const f1 = (await fila()).find(x => x.nome.startsWith(curto));
    if (!f1) { desvios.push('admissão pela interface não colocou o paciente na esteira'); }

    // 2) Enfermeiro lança sinais (Pacientes → Editar → Sinais)
    await ir(enf, '/main/pacientes');
    await passo(enf, 'Editar', { dentro: curto, espera: 1500 });
    await passo(enf, 'Sinais', { parcial: true });
    await digitar(enf, 'Temperatura', c.v.temp); await digitar(enf, 'SpO', c.v.spo2); await digitar(enf, 'Pressão', c.v.pa); await digitar(enf, 'FC', c.v.fc);
    await passo(enf, 'Salvar Alterações', { espera: 2200 });

    // 3) Painel após lançar sinais: aparece como esperado?
    await ir(medp, '/main', 2300);
    const at = await atencao();
    const nivelLista = at.find(a => a.nome.startsWith(curto))?.nivel ?? 'fora da lista';
    await passo(medp, c.nome, { parcial: true, espera: 1500 });
    const tx = await texto(medp);
    const estadoUi = ((tx.match(/Estado geral\s*\n?\s*(\S+)/) || [])[1]) || '?';
    prints.push(await foto(medp, `${c.id}_painel.png`));
    obs.push(`Painel: lista "Atenção agora" → ${nivelLista}; cartão "Estado geral" → ${estadoUi}`);
    const painelOk = (nivelLista === 'critico') === c.esperadoPainel.critico && estadoUi === c.esperadoPainel.estado;
    if (!painelOk) desvios.push(`Painel diferente do esperado (esperado crítico=${c.esperadoPainel.critico}, estado=${c.esperadoPainel.estado})`);

    // 4) Triagem cronometrada (tempo de AUTOMAÇÃO): t0 = clique em Iniciar Triagem; t1 = cor gravada
    await ir(enf, '/main/alertas');
    prints.push(await foto(enf, `${c.id}_antes.png`));
    const t0 = Date.now();
    const r0 = await passo(enf, 'Iniciar Triagem', { dentro: curto, espera: 0 });
    // aguarda o cartão exibir os botões de cor (como um humano esperaria) e clica na cor
    let rc = 'não encontrado'; const limite = Date.now() + 8000;
    while (Date.now() < limite) { rc = await passo(enf, c.cor, { dentro: curto, parcial: true, espera: 0 }); if (rc === 'ok') break; await sleep(100); }
    let t1 = null; const lim2 = Date.now() + 8000;
    while (Date.now() < lim2) { const f = (await fila()).find(x => x.nome.startsWith(curto)); if (f?.gravidade === c.cor) { t1 = Date.now(); break; } await sleep(80); }
    if (!t1) desvios.push('cor não foi gravada em 8 s');
    prints.push(await foto(enf, `${c.id}_triagem.png`));
    obs.push(`t0=${hms(t0)} (${r0}); clique na cor ${c.cor} (${rc}); t1=${t1 ? hms(t1) : 'não gravada'}; tempo de automação=${t1 ? mmss(t1 - t0) : '—'} (${t1 ? ((t1 - t0) / 1000).toFixed(1) + ' s' : ''})`);

    // 5) Médico: Chamar → Alta (sem PDF)
    await ir(medp, '/main/alertas');
    await passo(medp, 'Chamar', { dentro: curto, espera: 1300 });
    await passo(medp, 'Alta', { dentro: curto, espera: 1200 });
    await passo(medp, 'Dar Alta sem PDF', { espera: 2200 });
    prints.push(await foto(medp, `${c.id}_alta.png`));
    const aindaNaFila = (await fila()).some(x => x.nome.startsWith(curto));
    const pac = (await med('GET', '/patients')).data.find(x => x.nome_completo.startsWith(curto));
    const vis = (await med('GET', `/patients/${pac.id}/visitas`)).data;
    const v0 = vis.visitas?.[0];
    obs.push(`Alta: na esteira=${aindaNaFila}; paciente ativo=${pac.ativo}; última visita desfecho="${v0?.desfecho}", risco gravado="${v0?.classificacao_risco}", motivo="${v0?.motivo_visita}"; total de visitas=${vis.total}`);
    if (aindaNaFila || pac.ativo || v0?.desfecho !== 'Alta') desvios.push('alta não concluiu como esperado');
    if (v0?.classificacao_risco !== c.cor) desvios.push(`risco da visita (${v0?.classificacao_risco}) ≠ cor escolhida (${c.cor})`);

    registrar({
      id: c.id, perfil: 'Recepção → Enfermagem → Médico (automação)', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
      paciente: c.nome, queixa: c.queixa, sinais: `${c.v.spo2} · ${c.v.fc} · ${c.v.temp} · ${c.v.pa}`, cor: c.cor,
      t0: hms(t0), t1: t1 ? hms(t1) : null, tempo_automatizado: t1 ? mmss(t1 - t0) : null, tempo_ms: t1 ? t1 - t0 : null,
      painel: `${nivelLista}; estado ${estadoUi}`, desvios: desvios.join('; ') || 'nenhum',
      resultado: desvios.length ? 'REPROVADO' : 'APROVADO',
      notas: 'TEMPO DE AUTOMAÇÃO (navegador automatizado), NÃO é tempo humano de triagem. A medição humana (ensaio solo do desenvolvedor) é separada e não foi feita aqui. A cor foi escolhida arbitrariamente pelo executor, sem valor clínico. Pacientes TESTE A–E já existiam: entraram como retorno (visita ≥ 2).',
    });
  });
}
await rec.close(); await enf.close(); await medp.close();
await fechar();
