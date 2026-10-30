// Capturas S1–S5 e do roteiro do TCC (seção 10) no sistema JÁ ALTERADO. Banco de teste isolado, pacientes fictícios, IA só mock.
// Uso: source /tmp/testenv.sh; EV_DIR=<pasta>/telas node capturas_accr.mjs   (fila de teste vazia antes de rodar)
// Não lê nem imprime credenciais (SEED_* do ambiente de teste). Falha de captura é registrada, não escondida.
import fs from 'node:fs';
import { pagina, ir, passo, sleep, texto, fechar, abrir, apiLogin, foto } from '../../evidencias_testes_2026-10-29/runner/lib.mjs';

const OUT = process.env.EV_DIR; if (!OUT) throw new Error('Defina EV_DIR');
const log = [];
const L = (s) => { console.log(s); log.push(s); };
const mover = (de, para) => { fs.copyFileSync(`${OUT}/prints/${de}`, `${OUT}/${para}`); };
const tente = async (nome, fn) => { try { await fn(); L('✓ ' + nome); } catch (e) { L(`✗ ${nome}: ${String(e.message).slice(0, 200)}`); } };

const med = await apiLogin('medico'), enf = await apiLogin('enfermeiro'), rec = await apiLogin('recepcionista');
const suf = String(Date.now()).slice(-6); let n = 0;
const cpf = () => String(60000000000 + Number(suf) * 10 + (++n)).slice(0, 11);
const brt = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const SV = { frequencia_cardiaca: 76, saturacao_oxigenio: 98, temperatura: 36.6, pressao_arterial: '120/80' };
const P = {}, F = {};
async function criar(k, nome) {
  P[k] = (await rec('POST', '/patients', { nome_completo: nome, cpf: cpf(), idade: 40, sexo: 'F' })).data;
  F[k] = (await rec('POST', '/fila', { paciente_id: P[k].id, nome: P[k].nome_completo, idade: 40, senha: `T-${suf}-${k}`, chegada: brt(), status: 'Aguardando Triagem', motivo_visita: 'Texto fictício' })).data;
  await sleep(1100);
  await enf('POST', `/sinais/${P[k].id}`, SV);
  await enf('PUT', `/fila/${F[k].id}`, { status: 'Em Triagem (Enfermeiro)' });
}
const cls = (k, cor, just) => enf('PUT', `/fila/${F[k].id}`, { status: 'Aguardando Atendimento', gravidade: cor, ...(just ? { justificativa: just } : {}) });
const NOMES = { P1: 'Paciente Um Fictício', P2: 'Paciente Dois Fictício', P3: 'Paciente Três Fictício', P4: 'Paciente Quatro Fictício', P5: 'Paciente Cinco Fictício', P6: 'Paciente Seis Fictício', P7: 'Paciente Sete Fictício' };

const eEnf = await pagina('enfermeiro');
async function esteira(arq) { await ir(eEnf, '/main/alertas', 2500); await foto(eEnf, arq); }

// S1 → S2 → S3 (um único fixture contínuo)
for (const [k, cor] of [['P1', 'Verde'], ['P2', 'Vermelho'], ['P3', 'Azul'], ['P4', 'Laranja'], ['P5', 'Amarelo']]) { await criar(k, NOMES[k]); await cls(k, cor); }
await tente('S1 s1-fila-ordenada', async () => { await esteira('s1-fila-ordenada.png'); });
for (const k of ['P6', 'P7']) { await criar(k, NOMES[k]); await cls(k, 'Amarelo'); }
await tente('S2 s2-desempate', async () => { await esteira('s2-desempate.png'); });
await cls('P5', 'Vermelho', 'Reavaliação fictícia de teste');
await tente('S3 s3-reavaliacao', async () => { await esteira('s3-reavaliacao.png'); });
await tente('tcc-fila-espera / tcc-esteira-desktop', async () => { await ir(eEnf, '/main/alertas', 2500); await foto(eEnf, 'tcc-fila-espera.png'); await foto(eEnf, 'tcc-esteira-desktop.png'); });

// Paciente em triagem, sem cor, para o seletor (S4/S5)
await criar('P8', 'Paciente Oito Fictício');
let txtEnf = '';
await tente('S5 s5-seletor-sem-tempos + tcc-triagem-seletor', async () => {
  await ir(eEnf, '/main/alertas', 2500);
  txtEnf = await texto(eEnf);
  await foto(eEnf, 's5-seletor-sem-tempos.png'); await foto(eEnf, 'tcc-triagem-seletor.png');
});
const RE_PROIBIDO = /manchester|imediato|\b(10|60|120|240) ?min\b/i;
L(`S5 texto da esteira (enfermeiro): contém "Classificar risco"? ${/Classificar risco/.test(txtEnf)}; contém "o sistema não controla prazos"? ${/o sistema não controla prazos/.test(txtEnf)}; contém Manchester/Imediato/tempos-alvo? ${RE_PROIBIDO.test(txtEnf)}`);
L(`S5 trechos proibidos encontrados: ${JSON.stringify(txtEnf.match(new RegExp(RE_PROIBIDO.source, 'gi')) ?? [])}`);

// S4 — recepção: o seletor não aparece
const eRec = await pagina('recepcionista');
await tente('S4 s4-permissao-negada', async () => {
  await ir(eRec, '/main/alertas', 2500);
  const t = await texto(eRec);
  L(`S4 UI recepção: contém "Classificar risco"? ${/Classificar risco/.test(t)}; contém botões de cor do seletor? ${/Vermelho[\s\S]*Laranja[\s\S]*Amarelo[\s\S]*Verde[\s\S]*Azul/.test(t) && /Classificar risco/.test(t)}`);
  await foto(eRec, 's4-permissao-negada.png');
});

// Dashboard, Pacientes, Evento de reavaliação
const eMed = await pagina('medico');
await tente('tcc-dashboard-legenda', async () => {
  await ir(eMed, '/main', 3000);
  const t = await texto(eMed); L(`Dashboard: legenda "Cor = classificação de risco:" presente? ${t.includes('Cor = classificação de risco:')}; Manchester presente? ${/manchester/i.test(t)}`);
  await foto(eMed, 'tcc-dashboard-legenda.png');
});
await tente('tcc-pacientes-badge', async () => { await ir(eMed, '/main/pacientes', 2500); await foto(eMed, 'tcc-pacientes-badge.png'); });
await tente('tcc-reavaliacao-evento', async () => {
  await ir(eEnf, '/main/pacientes', 2500);
  await eEnf.eval(() => document.querySelector('input[aria-label="Pesquisar paciente por nome ou CPF"]')?.focus());
  await eEnf.send('Input.insertText', { text: 'Paciente Cinco' }); await sleep(1500);
  await passo(eEnf, 'Visualizar', { dentro: 'Paciente Cinco', espera: 1500 });
  await passo(eEnf, 'Histórico', { parcial: true, espera: 1500 });
  const t = await texto(eEnf); L(`Evento: "Registro de eventos" presente? ${t.includes('Registro de eventos')}; menciona Vermelho/Amarelo? ${/Vermelho/.test(t)}/${/Amarelo/.test(t)}`);
  await foto(eEnf, 'tcc-reavaliacao-evento.png');
});

// Mobile: seletor
const mob = await pagina('enfermeiro', { width: 390, height: 844, mobile: true });
await tente('S5 mobile (rótulo "Classificação de risco:")', async () => {
  await ir(mob, '/mobile', 3000);
  await passo(mob, 'Paciente Oito', { parcial: true, espera: 1500 }).catch(() => {});
  const t = await texto(mob);
  L(`Mobile: "Classificação de risco:" presente? ${t.includes('Classificação de risco:')}; Manchester/tempos? ${JSON.stringify(t.match(new RegExp(RE_PROIBIDO.source, 'gi')) ?? [])}`);
  await foto(mob, 's5-mobile-seletor.png');
});

fs.writeFileSync(`${OUT}/capturas_accr.log`, log.join('\n') + '\n');
await fechar();
