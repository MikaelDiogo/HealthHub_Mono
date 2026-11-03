import fs from 'node:fs';
import { pagina, ir, passo, passoRe, digitar, foto, sleep, texto, temTexto, registrar, horaBR, fechar, abrir, apiLogin, caso, observarRede, EV } from './lib.mjs';
const med = await apiLogin('medico'); const rec = await apiLogin('recepcionista'); const enf = await apiLogin('enfermeiro');
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fila = async () => (await med('GET', '/fila')).data;
const porNome = async (n) => (await fila()).find(x => x.nome.startsWith(n));
const paciente = async (n) => (await med('GET', '/patients')).data.find(x => x.nome_completo.startsWith(n));
const visitas = async (id) => (await med('GET', `/patients/${id}/visitas`)).data;
fs.mkdirSync(`${EV}/downloads`, { recursive: true });

// Preparação (API, marcada): TESTE H — Melo, classificado, para o caminho "Dar Alta sem PDF"
{
  const c = await rec('POST', '/patients', { nome_completo: 'TESTE H — Melo', cpf: '99999999908', idade: 41, sexo: 'M' });
  await enf('POST', `/sinais/${c.data.id}`, { saturacao_oxigenio: 98, frequencia_cardiaca: 74, temperatura: 36.6, pressao_arterial: '118/76' });
  const a = await rec('POST', '/fila', { paciente_id: c.data.id, nome: 'TESTE H — Melo', idade: 41, senha: 'PR-007', chegada: brt(), status: 'Aguardando Triagem' });
  await enf('PUT', `/fila/${a.data.id}`, { status: 'Em Triagem (Enfermeiro)' });
  await enf('PUT', `/fila/${a.data.id}`, { status: 'Aguardando Atendimento', gravidade: 'Verde' });
}

await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const b = await abrir();
  await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: `${EV}/downloads`.replace(/\//g, '\\') });
  const p = await pagina('medico'); const ev = await observarRede(p);
  await ir(p, '/main/alertas');

  // Caminho 1 — TESTE A: Chamar → Observação → Liberar Alta
  await passo(p, 'Chamar', { dentro: 'TESTE A', espera: 1500 });
  let s = (await porNome('TESTE A'))?.status; obs.push(`A: após Chamar → "${s}"`);
  prints.push(await foto(p, 'F11_A_consulta.png'));
  await passoRe(p, /Observação$/, { dentro: 'TESTE A', espera: 1500 });
  s = (await porNome('TESTE A'))?.status; obs.push(`A: após Observação → "${s}"`);
  prints.push(await foto(p, 'F11_A_observacao.png'));
  await passo(p, 'Liberar Alta', { dentro: 'TESTE A', espera: 2000 });
  const fa = await porNome('TESTE A'); const pa = await paciente('TESTE A'); const va = await visitas(pa.id);
  obs.push(`A: após Liberar Alta → na fila=${!!fa}; paciente ativo=${pa.ativo}; visitas=${va.total}, desfecho da última="${va.visitas?.[0]?.desfecho}", alta registrada=${!!va.visitas?.[0]?.alta}`);
  prints.push(await foto(p, 'F11_A_alta.png'));

  // Caminho 2 — TESTE B: Chamar → Alta → Exportar Guia e Dar Alta (PDF)
  await passo(p, 'Chamar', { dentro: 'TESTE B', espera: 1500 });
  await passo(p, 'Alta', { dentro: 'TESTE B', espera: 1200 });
  await digitar(p, 'Medicamentos e Orientações', 'Paracetamol 500 mg se dor (texto fictício)');
  await digitar(p, 'Orientações à Equipe', 'Verificar sinais antes da saída (texto fictício)');
  prints.push(await foto(p, 'F11_B_modal_alta.png'));
  await passo(p, 'Exportar Guia e Dar Alta', { espera: 3500 });
  const fb = await porNome('TESTE B'); const pb = await paciente('TESTE B'); const vb = await visitas(pb.id);
  const pdfs = fs.readdirSync(`${EV}/downloads`).filter(f => f.endsWith('.pdf'));
  obs.push(`B (com PDF): na fila=${!!fb}; ativo=${pb.ativo}; desfecho="${vb.visitas?.[0]?.desfecho}"; PDF baixado=${pdfs.join(', ') || 'nenhum'}`);
  prints.push(await foto(p, 'F11_B_alta_pdf.png'));

  // Caminho 3 — TESTE H: Chamar → Alta → Dar Alta sem PDF
  await passo(p, 'Chamar', { dentro: 'TESTE H', espera: 1500 });
  await passo(p, 'Alta', { dentro: 'TESTE H', espera: 1200 });
  await passo(p, 'Dar Alta sem PDF', { espera: 2500 });
  const fh = await porNome('TESTE H'); const ph = await paciente('TESTE H'); const vh = await visitas(ph.id);
  const pdfs2 = fs.readdirSync(`${EV}/downloads`).filter(f => f.endsWith('.pdf'));
  obs.push(`H (sem PDF): na fila=${!!fh}; ativo=${ph.ativo}; desfecho="${vh.visitas?.[0]?.desfecho}"; PDFs na pasta continuam ${pdfs2.length}`);
  prints.push(await foto(p, 'F11_H_alta_sem_pdf.png'));

  // Aba "Com alta"
  await ir(p, '/main/pacientes');
  await p.eval(() => document.querySelector('input[type=radio][value=alta]')?.click()); await sleep(1500);
  const lista = await texto(p);
  const naAba = ['TESTE A', 'TESTE B', 'TESTE H'].map(n => `${n}=${lista.includes(n)}`).join(', ');
  obs.push(`Aba "Com alta": ${naAba}`);
  prints.push(await foto(p, 'F11_aba_com_alta.png'));
  await p.close();

  const ok = !fa && !fb && !fh && pa.ativo === false && pb.ativo === false && ph.ativo === false && pdfs.length >= 1 && pdfs2.length === pdfs.length && ['TESTE A', 'TESTE B', 'TESTE H'].every(n => lista.includes(n));
  registrar({ id: 'F11', perfil: 'Médico', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado: ok ? 'APROVADO' : 'REPROVADO',
    notas: 'Preparação via API (marcada): TESTE H criado e classificado Verde para o caminho "sem PDF". A alta a partir da Observação usa "Liberar Alta" (sem modal/PDF); os caminhos com e sem PDF partem de "Em Consulta". Conteúdo do PDF não foi inspecionado visualmente nesta execução, só a geração do arquivo.' });
});

// ── F12 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const p = await pagina('recepcionista'); const ev = await observarRede(p);
  await ir(p, '/main/pacientes');
  await p.eval(() => document.querySelector('input[type=radio][value=alta]')?.click()); await sleep(1500);
  prints.push(await foto(p, 'F12_tela1.png'));
  await passo(p, 'Readmitir', { dentro: 'TESTE A', espera: 1800 });
  const t = await texto(p);
  const mostraHistorico = /Visitas anteriores/.test(t);
  prints.push(await foto(p, 'F12_modal_historico.png'));
  await passoRe(p, /^Admitir( como| —)/, { espera: 2000 });
  const fa = await porNome('TESTE A'); const pa = await paciente('TESTE A'); const va = await visitas(pa.id);
  prints.push(await foto(p, 'F12_resultado.png'));
  obs.push(`Modal mostrou histórico ("Visitas anteriores")=${mostraHistorico}; após confirmar: na fila=${!!fa}, status="${fa?.status}", senha=${fa?.senha}; paciente ativo=${pa.ativo}; visitas=${va.total}; visita mais recente: desfecho="${va.visitas?.[0]?.desfecho}", alta=${va.visitas?.[0]?.alta ?? 'aberta'}`);
  await p.close();
  const ok = mostraHistorico && fa?.status === 'Aguardando Triagem' && pa.ativo === true && va.total === 2 && !va.visitas?.[0]?.alta;
  registrar({ id: 'F12', perfil: 'Recepcionista', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '), resultado: ok ? 'APROVADO' : 'REPROVADO', notas: '' });
});
await fechar();
