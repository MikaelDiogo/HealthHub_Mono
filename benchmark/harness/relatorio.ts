import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { CUSTO_USD_POR_TOKEN_IN, CUSTO_USD_POR_TOKEN_OUT } from './adapters/anthropicApi';

interface Linha {
  id: string;
  repeticao: string;
  diagnosticos_modelo: string;
  urgencia_modelo: string;
  gabarito: string;
  triagem_ok: string;
  formato_ok: string;
  tempo_ms: string;
  tokens_in: string;
  tokens_out: string;
  dx_top3_ok: string;
  erro: string;
}

function media(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}
function desvioPadrao(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = media(nums);
  return Math.sqrt(media(nums.map((n) => (n - m) ** 2)));
}
function percentil(nums: number[], p: number): number {
  if (!nums.length) return NaN;
  const ordenado = [...nums].sort((a, b) => a - b);
  const idx = Math.min(ordenado.length - 1, Math.ceil((p / 100) * ordenado.length) - 1);
  return ordenado[Math.max(0, idx)];
}

function analisarModelo(nomeArquivo: string) {
  const raw = readFileSync(new URL(`./resultados/${nomeArquivo}`, import.meta.url), 'utf-8');
  const linhas = parse(raw, { columns: true, skip_empty_lines: true }) as Linha[];

  const formatoOk = linhas.filter((l) => l.formato_ok === 'true');
  const taxaFormatoValido = linhas.length ? formatoOk.length / linhas.length : 0;

  // Acurácia de triagem: média ± desvio entre as 3 repetições (uma acurácia por repetição)
  const porRepeticao = new Map<string, Linha[]>();
  for (const l of linhas) {
    if (!porRepeticao.has(l.repeticao)) porRepeticao.set(l.repeticao, []);
    porRepeticao.get(l.repeticao)!.push(l);
  }
  const acuraciasTriagemPorRep: number[] = [];
  for (const grupo of porRepeticao.values()) {
    const comResposta = grupo.filter((l) => l.triagem_ok !== '');
    const acertos = comResposta.filter((l) => l.triagem_ok === 'true').length;
    acuraciasTriagemPorRep.push(comResposta.length ? acertos / comResposta.length : 0);
  }

  // Acurácia de diagnóstico top-3: só conta o que já foi conferido manualmente (dx_top3_ok preenchido)
  const diagConferidos = linhas.filter((l) => l.dx_top3_ok === 'true' || l.dx_top3_ok === 'false');
  const acuraciaDiagnostico = diagConferidos.length
    ? diagConferidos.filter((l) => l.dx_top3_ok === 'true').length / diagConferidos.length
    : null;

  // Consistência: % de vinhetas com a MESMA urgência nas 3 repetições
  const porVinheta = new Map<string, Linha[]>();
  for (const l of linhas) {
    if (!porVinheta.has(l.id)) porVinheta.set(l.id, []);
    porVinheta.get(l.id)!.push(l);
  }
  let consistentes = 0;
  for (const grupo of porVinheta.values()) {
    const urgencias = new Set(grupo.map((l) => l.urgencia_modelo));
    if (urgencias.size === 1) consistentes++;
  }
  const consistencia = porVinheta.size ? consistentes / porVinheta.size : 0;

  const tempos = linhas.map((l) => Number(l.tempo_ms)).filter((n) => !isNaN(n) && n > 0);
  const tokensIn = linhas.reduce((acc, l) => acc + (Number(l.tokens_in) || 0), 0);
  const tokensOut = linhas.reduce((acc, l) => acc + (Number(l.tokens_out) || 0), 0);

  const nomeModelo = nomeArquivo.replace('.csv', '');
  const ehSonnetApi = nomeModelo.includes('via-api');
  const custoEstimado = ehSonnetApi
    ? tokensIn * CUSTO_USD_POR_TOKEN_IN + tokensOut * CUSTO_USD_POR_TOKEN_OUT
    : null;

  return {
    nomeModelo,
    totalLinhas: linhas.length,
    taxaFormatoValido,
    acuraciaTriagemMedia: media(acuraciasTriagemPorRep),
    acuraciaTriagemDesvio: desvioPadrao(acuraciasTriagemPorRep),
    acuraciaDiagnostico,
    diagConferidos: diagConferidos.length,
    consistencia,
    tempoMedioMs: media(tempos),
    tempoP95Ms: percentil(tempos, 95),
    tokensIn,
    tokensOut,
    custoEstimado,
  };
}

function fmtPct(n: number | null): string {
  if (n === null || isNaN(n)) return '— (aguardando conferência manual)';
  return `${(n * 100).toFixed(1)}%`;
}

function main() {
  const arquivos = readdirSync(new URL('./resultados', import.meta.url)).filter((f) => f.endsWith('.csv') && f !== 'resumo.md');

  if (arquivos.length === 0) {
    console.error('Nenhum CSV de resultado encontrado em eval/resultados/. Rode o runner primeiro.');
    process.exit(1);
  }

  const analises = arquivos.map(analisarModelo);

  let md = `# Resumo do Benchmark — HealthHub\n\n`;
  md += `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (horário de Brasília).\n\n`;
  md += `> A coluna "acurácia de diagnóstico top-3" só considera linhas cuja coluna \`dx_top3_ok\` já foi preenchida manualmente em \`eval/resultados/<modelo>.csv\`. Linhas sem preenchimento ficam de fora da média — a correspondência de texto livre não é decidida por regra automática.\n\n`;

  md += `## Por modelo\n\n`;
  md += `| Modelo | Acurácia triagem (méd ± dp) | Acurácia diagnóstico top-3 | Consistência | Formato válido | Tempo médio (p95) | Tokens in/out | Custo estimado |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  for (const a of analises) {
    md += `| ${a.nomeModelo} | ${fmtPct(a.acuraciaTriagemMedia)} ± ${(a.acuraciaTriagemDesvio * 100).toFixed(1)}pp | ${fmtPct(a.acuraciaDiagnostico)} (n=${a.diagConferidos}) | ${fmtPct(a.consistencia)} | ${fmtPct(a.taxaFormatoValido)} | ${a.tempoMedioMs.toFixed(0)}ms (${a.tempoP95Ms.toFixed(0)}ms) | ${a.tokensIn}/${a.tokensOut} | ${a.custoEstimado !== null ? `US$ ${a.custoEstimado.toFixed(4)}` : 'Groq: conforme plano · Claude Code: não exposto pela CLI por chamada'} |\n`;
  }

  md += `\n## Tabela 6 — comparação com a literatura (para o TCC)\n\n`;
  md += `| Modelo | Diagnóstico top-3 | Triagem | Fonte |\n`;
  md += `|---|---|---|---|\n`;
  md += `| GPT-3 | 88% | 71% | **Literatura** — Levine et al. (2024), *The Lancet Digital Health* |\n`;
  md += `| Claude 3.5 Sonnet | 100% | 94% | **Literatura** — Sorich et al. (2024), *JMIR* |\n`;
  for (const a of analises) {
    md += `| ${a.nomeModelo} | ${fmtPct(a.acuraciaDiagnostico)} | ${fmtPct(a.acuraciaTriagemMedia)} | **Medido neste trabalho** (${a.totalLinhas / 3} vinhetas × 3 repetições) |\n`;
  }

  md += `\n### Limitações (não remover do TCC)\n\n`;
  md += `- 48 vinhetas é um conjunto pequeno; a triagem é binária (urgente/não-urgente), não os 5 níveis do Protocolo de Manchester.\n`;
  md += `- A comparação com GPT-3 e Claude 3.5 Sonnet é indireta: resultados publicados, possivelmente com prompts diferentes dos usados aqui.\n`;
  md += `- Resultados via Claude Code (subprocesso \`claude -p\`) aproximam, mas não igualam exatamente, uma chamada direta pela API (overhead do CLI, possíveis diferenças de parâmetros padrão).\n`;
  md += `- Este benchmark mede o **modelo**, não o sistema HealthHub como um todo, e não substitui avaliação com profissionais de saúde (prevista na DSR do TCC).\n`;
  md += `- Ollama não está implementado no HealthHub no momento desta avaliação — não entra na comparação.\n`;

  const caminho = new URL('./resultados/resumo.md', import.meta.url);
  writeFileSync(caminho, md, 'utf-8');
  console.log(md);
  console.log('\nSalvo em eval/resultados/resumo.md');
}

main();
