import 'dotenv/config';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type { LinhaResultado, ModelAdapter, Vinheta } from './types';
import { groqAdapter } from './adapters/groq';
import { criarClaudeCodeAdapter } from './adapters/claudeCode';
import { anthropicApiAdapter } from './adapters/anthropicApi';

const REPETICOES = 3;
const RETRY_MAX = 2;
const RETRY_DELAY_MS = 2000;

function carregarVinhetas(): Vinheta[] {
  const raw = readFileSync(new URL('./vinhetas.csv', import.meta.url), 'utf-8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return rows.map((r) => ({
    id: r.id,
    vinheta: r.vinheta,
    diagnostico_correto: r.diagnostico_correto,
    urgente: (Number(r.urgente) === 1 ? 1 : 0) as 0 | 1,
    triagem_original: r.triagem_original,
  }));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function classificarComRetry(adapter: ModelAdapter, vinheta: Vinheta) {
  let ultimoResultado: Awaited<ReturnType<ModelAdapter['classificar']>> | undefined;
  for (let tentativa = 0; tentativa <= RETRY_MAX; tentativa++) {
    const resultado = await adapter.classificar(vinheta);
    // Só repete falha de infraestrutura (rede/processo). JSON inválido do modelo
    // conta como erro de formato e é registrado como está — não se repete, não se descarta.
    if (resultado.tipo_erro !== 'infra') return resultado;
    ultimoResultado = resultado;
    if (tentativa < RETRY_MAX) await sleep(RETRY_DELAY_MS * (tentativa + 1));
  }
  return {
    ...ultimoResultado!,
    erro: `Falhou após ${RETRY_MAX + 1} tentativas: ${ultimoResultado?.erro}`,
  };
}

const CABECALHO: (keyof LinhaResultado)[] = [
  'id', 'repeticao', 'diagnosticos_modelo', 'urgencia_modelo', 'gabarito',
  'triagem_ok', 'formato_ok', 'tempo_ms', 'tokens_in', 'tokens_out', 'custo_usd', 'dx_top3_ok', 'erro',
];

/** Lê o CSV parcial já salvo (se existir) para retomar de onde parou, sem refazer chamadas já feitas. */
function carregarFeitas(caminho: URL): Set<string> {
  if (!existsSync(caminho)) return new Set();
  const raw = readFileSync(caminho, 'utf-8');
  const linhas = parse(raw, { columns: true, skip_empty_lines: true }) as { id: string; repeticao: string }[];
  return new Set(linhas.map((l) => `${l.id}-${l.repeticao}`));
}

// Quantas chamadas em paralelo. Moderado de propósito — mais que isso arrisca
// mais quedas por memória (cada 'claude -p' é um processo novo).
const CONCORRENCIA = 3;

async function processarUm(adapter: ModelAdapter, vinheta: Vinheta, repeticao: number, caminho: URL) {
  process.stdout.write(`[${adapter.nome}] vinheta ${vinheta.id} rep ${repeticao}/${REPETICOES}... `);
  const resultado = await classificarComRetry(adapter, vinheta);

  const urgenciaEsperada = vinheta.urgente === 1 ? 'urgent' : 'nonurgent';
  const triagemOk = resultado.classificacao
    ? String(resultado.classificacao.urgency === urgenciaEsperada)
    : '';

  const linha: LinhaResultado = {
    id: vinheta.id,
    repeticao,
    diagnosticos_modelo: resultado.classificacao?.diagnoses.join(' | ') ?? '',
    urgencia_modelo: resultado.classificacao?.urgency ?? '',
    gabarito: vinheta.diagnostico_correto,
    triagem_ok: triagemOk as '' | 'true' | 'false',
    formato_ok: resultado.formato_ok ? 'true' : 'false',
    tempo_ms: resultado.tempo_ms,
    tokens_in: resultado.tokens_in ?? 0,
    tokens_out: resultado.tokens_out ?? 0,
    custo_usd: resultado.custo_usd ?? 0,
    dx_top3_ok: '', // preenchimento manual
    erro: resultado.erro ?? '',
  };

  // Grava linha a linha — uma queda do processo não perde o que já rodou.
  // appendFileSync é síncrono (uma chamada de sistema por vez), então chamadas
  // concorrentes não corrompem o arquivo mesmo terminando em paralelo.
  const linhaCsv = stringify([CABECALHO.map((c) => linha[c])], {});
  appendFileSync(caminho, linhaCsv, 'utf-8');

  console.log(resultado.formato_ok ? 'ok' : `ERRO: ${resultado.erro}`);
}

async function rodarModelo(adapter: ModelAdapter, vinhetas: Vinheta[], caminho: URL) {
  const feitas = carregarFeitas(caminho);
  if (feitas.size > 0) {
    console.log(`Retomando: ${feitas.size} chamadas já salvas de execução anterior, não serão refeitas.`);
  } else {
    writeFileSync(caminho, stringify([CABECALHO], {}), 'utf-8');
  }

  const pendentes: { vinheta: Vinheta; repeticao: number }[] = [];
  for (const vinheta of vinhetas) {
    for (let repeticao = 1; repeticao <= REPETICOES; repeticao++) {
      if (!feitas.has(`${vinheta.id}-${repeticao}`)) pendentes.push({ vinheta, repeticao });
    }
  }

  for (let i = 0; i < pendentes.length; i += CONCORRENCIA) {
    const lote = pendentes.slice(i, i + CONCORRENCIA);
    await Promise.all(lote.map((p) => processarUm(adapter, p.vinheta, p.repeticao, caminho)));
  }
}

async function main() {
  const limite = process.env.EVAL_LIMIT ? Number(process.env.EVAL_LIMIT) : undefined;
  const todasVinhetas = carregarVinhetas();
  const vinhetas = limite ? todasVinhetas.slice(0, limite) : todasVinhetas;

  console.log(`Carregadas ${todasVinhetas.length} vinhetas${limite ? ` (rodando só as ${limite} primeiras)` : ''}.`);

  // EVAL_MODELOS_CLAUDE: ids separados por vírgula (padrão: os três avaliados neste trabalho)
  const modelosClaude = (process.env.EVAL_MODELOS_CLAUDE ?? 'claude-sonnet-5,claude-sonnet-5-5,claude-opus-5-5').split(',').map((m) => m.trim());
  const adapters = [groqAdapter, ...modelosClaude.map(criarClaudeCodeAdapter), anthropicApiAdapter];
  const disponiveis = adapters.filter((a) => a.disponivel());
  const indisponiveis = adapters.filter((a) => !a.disponivel());

  if (indisponiveis.length > 0) {
    console.log(`Pulando (sem credencial): ${indisponiveis.map((a) => a.nome).join(', ')}`);
  }
  if (disponiveis.length === 0) {
    console.error('Nenhum modelo disponível. Configure eval/.env (veja eval/.env.example).');
    process.exit(1);
  }

  mkdirSync(new URL('./resultados', import.meta.url), { recursive: true });

  for (const adapter of disponiveis) {
    console.log(`\n=== Rodando ${adapter.nome} (${vinhetas.length} vinhetas × ${REPETICOES} repetições) ===`);
    const caminho = new URL(`./resultados/${adapter.nome}.csv`, import.meta.url);
    await rodarModelo(adapter, vinhetas, caminho);
    console.log(`Concluído: eval/resultados/${adapter.nome}.csv`);
  }
}

main().catch((err) => {
  console.error('Erro fatal no runner:', err);
  process.exit(1);
});
