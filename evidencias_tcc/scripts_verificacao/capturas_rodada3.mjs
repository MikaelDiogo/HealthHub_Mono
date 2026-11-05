// Capturas de tela da rodada 3 (limiares com fonte e pressão arterial), a partir do clone limpo. Banco de TESTE isolado, dados FICTÍCIOS, IA SIMULADA (mock).
// Viewport 1280 x 800, tema claro, zoom 100%, PNG. Usuários: Recepcionista Teste, Enfermeiro Teste, Médico Teste. Pacientes: TESTE C a K.
// Uso: source <ambiente do banco de teste>; CDP_LIB=<cdp.mjs> EV_DIR=<pasta> COMMIT=<hash> node capturas_rodada3.mjs   (API em :3001 com o mock e Vite em :5173)
// Os números das figuras (19, 19b, 20, 30) são os do pedido da rodada 3 ("figura atual do TCC"). Uma captura que falha entra no manifesto como FALHA.
import fs from 'node:fs';
import { pagina, ir, passo, sleep, texto, fechar, apiLogin } from './cenarios22/lib.mjs';

const OUT = (process.env.EV_DIR || './saida_capturas_r3').replace(/\\/g, '/').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const COMMIT = process.env.COMMIT || 'desconhecido';
const VP = { width: 1280, height: 800 };
const manifesto = [];
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
async function foto(page, arquivo, meta) {
  await sleep(600);
  await page.screenshot({ path: OUT + arquivo, format: 'png' });
  manifesto.push({ arquivo, ...meta, data_hora: agora(), commit: COMMIT, resultado: 'OK' });
  console.log('✓', arquivo);
}
const tente = async (nome, fn) => { try { await fn(); } catch (e) { manifesto.push({ arquivo: `(FALHA) ${nome}`, observacoes: String(e.message).slice(0, 240), data_hora: agora(), commit: COMMIT, resultado: 'FALHA' }); console.log('✗', nome, e.message); } };
const rolarFoco = (p) => p.eval(() => [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Paciente em foco')?.scrollIntoView({ block: 'start' })).then(() => sleep(1200));
const rolarAtencao = (p) => p.eval(() => [...document.querySelectorAll('h1,h2,h3,p,span,div')].find((e) => e.childElementCount === 0 && /^Atenção agora/.test(e.textContent.trim()))?.scrollIntoView({ block: 'start' })).then(() => sleep(1200));

const med = await apiLogin('medico'), enf = await apiLogin('enfermeiro'), rec = await apiLogin('recepcionista');
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const suf = String(Date.now()).slice(-6); let n = 0;
const cpf = () => String(82000000000 + Number(suf) * 10 + (++n)).slice(0, 11);
const SV = (o = {}) => ({ saturacao_oxigenio: 98, frequencia_cardiaca: 76, temperatura: 36.6, pressao_arterial: '120/80', ...o });
const pacs = {};
async function criar(nome, idade, sexo, sinais, status = 'Aguardando Atendimento') {
  const p = (await rec('POST', '/patients', { nome_completo: nome, cpf: cpf(), idade, sexo })).data;
  await enf('POST', `/sinais/${p.id}`, SV(sinais));
  await rec('POST', '/fila', { paciente_id: p.id, nome: p.nome_completo, idade: p.idade, chegada: brt(), status, motivo_visita: 'captura rodada 3 (fictício)' });
  pacs[nome] = p; await sleep(1100);
}
// F14 (C, D, E) e os casos novos de pressão e temperatura
await criar('TESTE C', 41, 'F', { temperatura: 38.6, saturacao_oxigenio: 91, pressao_arterial: '100/60', frequencia_cardiaca: 110 });
await criar('TESTE D', 57, 'M', { temperatura: 36.0, frequencia_cardiaca: 55, pressao_arterial: '110/70' });
await criar('TESTE E', 25, 'F', { temperatura: 38.5, saturacao_oxigenio: 92, pressao_arterial: '130/85', frequencia_cardiaca: 88 });
await criar('TESTE F', 63, 'M', { pressao_arterial: '190/120' });
await criar('TESTE G', 30, 'F', { pressao_arterial: '130/85' });
await criar('TESTE H', 48, 'M', { pressao_arterial: '150/95' });
await criar('TESTE I', 72, 'F', { pressao_arterial: '85/50' });
await criar('TESTE J', 35, 'M', { temperatura: 39.1 });
await criar('TESTE K', 29, 'F', { temperatura: 39.0 });

async function focoDe(papel, nome) {
  const p = await pagina(papel, VP);
  await ir(p, '/main', 2800);
  await passo(p, nome, { parcial: true, espera: 1500 });
  await rolarFoco(p);
  return p;
}
const dizTela = async (p, re) => re.test(await texto(p));

await tente('fig19 / fig19b: painel do médico', async () => {
  const p = await pagina('medico', VP);
  await ir(p, '/main', 3000);
  await foto(p, 'fig19_painel.png', { figura: '19 (parte 1 de 2)', tela: 'Painel: indicadores, esteira agora e paciente em foco (com o cartão Pressão arterial)', perfil: 'Médico', paciente: 'TESTE C a K', observacoes: 'O painel é mais alto que a janela: a lista "atenção agora" está na fig19b' });
  await rolarAtencao(p);
  const t = await texto(p);
  await foto(p, 'fig19b_painel_atencao_agora.png', { figura: '19 (parte 2 de 2)', tela: 'Painel: lista "atenção agora" com os motivos, incluindo a pressão arterial (PA 190/120 e PA 85/50)', perfil: 'Médico', paciente: 'TESTE C, D, F, I e J', observacoes: `Texto da lista contém "PA 190/120": ${t.includes('PA 190/120')}; "PA 85/50": ${t.includes('PA 85/50')}; "Temperatura 39.1": ${t.includes('39.1')}` });
  await p.close();
});

await tente('fig20: histórico de sinais com cartão de pressão (enfermeiro)', async () => {
  const p = await focoDe('enfermeiro', 'TESTE C');
  await foto(p, 'fig20_historico_sinais.png', { figura: '20', tela: 'Paciente em foco com o cartão Pressão arterial (100/60 mmHg, Atenção) e o histórico de sinais em gráfico', perfil: 'Enfermeiro', paciente: 'TESTE C', observacoes: 'Valores: SpO₂ 91, FC 110, 38,6 °C, PA 100/60' });
  await p.close();
});

await tente('fig30: painel no cenário de fronteira F14', async () => {
  const p = await focoDe('medico', 'TESTE E');
  const ok = await dizTela(p, /Estado geral\s*Atenção/);
  await foto(p, 'fig30_painel_atencao_f14.png', { figura: '30', tela: 'Painel no cenário de fronteira F14: TESTE E (SpO₂ 92, 38,5 °C, FC 88, PA 130/85) em Atenção', perfil: 'Médico', paciente: 'TESTE E (com TESTE C e D na lista)', observacoes: `Estado geral de TESTE E na tela = Atenção: ${ok}. Antes da rodada 3 também era Atenção (38,5 não passava de > 38,5): nenhum estado mudou nesta captura. TESTE C (38,6 °C): continua Crítico por SpO₂ 91 e FC 110; a temperatura 38,6 deixou de ser motivo (agora Atenção)` });
  await p.close();
});

await tente('novo11: PA 190/120 crítica', async () => {
  const p = await focoDe('medico', 'TESTE F');
  const ok = await dizTela(p, /Estado geral\s*Crítico/);
  await foto(p, 'novo11_pa_critica_painel.png', { figura: 'nova', tela: 'Paciente em foco com PA 190/120 (Estado geral Crítico, cartão Pressão arterial Crítico)', perfil: 'Médico', paciente: 'TESTE F', observacoes: `Estado geral Crítico na tela: ${ok}. A lista "atenção agora" com "PA 190/120" está na fig19b` });
  await p.close();
});

for (const [arq, nome, pa, esperado] of [['novo12a_pa_normal_130-85.png', 'TESTE G', '130/85', 'Normal'], ['novo12b_pa_atencao_150-95.png', 'TESTE H', '150/95', 'Atenção'], ['novo12c_pa_critica_85-50.png', 'TESTE I', '85/50', 'Crítico']]) {
  await tente(`novo12 ${pa}`, async () => {
    const p = await focoDe('medico', nome);
    const ok = await dizTela(p, new RegExp(`Pressão arterial\\s*${pa.replace('/', '\\/')}\\s*mmHg\\s*${esperado}`));
    await foto(p, arq, { figura: 'nova', tela: `Cartão Pressão arterial com ${pa} mmHg: ${esperado}`, perfil: 'Médico', paciente: nome, observacoes: `Cartão mostra "${esperado}": ${ok}` });
    await p.close();
  });
}

for (const [arq, nome, temp, esperado] of [['novo13a_temperatura_39-1_critico.png', 'TESTE J', '39.1', 'Crítico'], ['novo13b_temperatura_39-0_atencao.png', 'TESTE K', '39', 'Atenção']]) {
  await tente(`novo13 ${temp}`, async () => {
    const p = await focoDe('medico', nome);
    const ok = await dizTela(p, new RegExp(`Temperatura\\s*${temp.replace('.', '\\.')}\\s*°C\\s*${esperado}`));
    await foto(p, arq, { figura: 'nova', tela: `Cartão Temperatura com ${temp} °C: ${esperado}`, perfil: 'Médico', paciente: nome, observacoes: `Cartão mostra "${esperado}": ${ok}` });
    await p.close();
  });
}

const cab = ['arquivo', 'figura', 'tela', 'perfil', 'paciente', 'data_hora', 'commit', 'resultado', 'observacoes'];
fs.writeFileSync(OUT + 'figuras_manifesto.csv', [cab.join(','), ...manifesto.map((m) => cab.map((c) => csvCell(m[c])).join(','))].join(String.fromCharCode(10)) + String.fromCharCode(10));
await fechar();
console.log(`${manifesto.filter((m) => m.resultado === 'OK').length} capturas OK, ${manifesto.filter((m) => m.resultado !== 'OK').length} falhas`);
