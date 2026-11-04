// Sonda de pensamento estendido (Etapa 4): 3 chamadas por modelo com a MESMA configuração do harness do benchmark
// (benchmark/harness/adapters/claudeCode.ts), trocando só a saída para stream-json (com --verbose), que lista os blocos
// de conteúdo (text, thinking, ...) e o uso de tokens. Vinhetas 1 a 3 do benchmark (casos fictícios públicos).
// Uso: node sonda_pensamento.mjs   (autenticação: a do próprio `claude` já logado; nenhuma chave é lida ou impressa)
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const AQUI = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const HARNESS = AQUI + '../../../benchmark/harness/';
const MODELOS = ['claude-sonnet-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];
const N = 3;

// Prompt do sistema e vinhetas: lidos do harness (nada é reescrito aqui)
const promptTs = readFileSync(HARNESS + 'prompt.ts', 'utf8');
const SYSTEM = promptTs.match(/SYSTEM_PROMPT = `([\s\S]*?)`;/)[1];
const csv = readFileSync(HARNESS + 'vinhetas.csv', 'utf8').split(/\r?\n/).slice(1, 1 + N);
// A coluna da vinheta vem entre aspas (quando tem vírgula ou aspas) ou sem aspas; em ambos os casos termina antes de `,<diagnóstico>,<0|1>,<triagem>`
const vinhetas = csv.map((l) => {
  const q = l.match(/^(\d+),"((?:[^"]|"")*)",/);
  if (q) return { id: q[1], texto: q[2].replace(/""/g, '"') };
  const s = l.match(/^(\d+),(.*),[^,]*,[01],[^,]*$/);
  return { id: s[1], texto: s[2] };
});
const flat = (t) => t.replace(/\s*\r?\n\s*/g, ' ').trim();

// Ambiente do subprocesso: como o harness (cleanEnv), sem variáveis da sessão pai nem de esforço
const { CLAUDECODE, CLAUDE_CODE_SESSION_ID, CLAUDE_CODE_ENTRYPOINT, CLAUDE_PID, CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_BRIDGE_SESSION_ID,
  CLAUDE_CODE_MESSAGING_SOCKET, CLAUDE_CODE_MESSAGING_TOKEN, CLAUDE_CODE_SSE_PORT, AI_AGENT, CLAUDE_EFFORT, ...resto } = process.env;
const env = { ...resto, CLAUDE_CODE_CHILD_SESSION: '1' };

// No Windows o 'claude' do npm é um atalho .cmd; chamamos o executável direto (argumentos escapados corretamente, sem shell)
import { existsSync } from 'node:fs';
const EXE_NPM = (process.env.APPDATA ?? '') + '/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe';
const CLAUDE = process.env.CLAUDE_EXE || (existsSync(EXE_NPM) ? EXE_NPM : 'claude');
const versao = spawnSync(CLAUDE, ['--version'], { encoding: 'utf8' }).stdout.trim();
const saida = [];
mkdirSync(AQUI + 'bruto', { recursive: true });
let custoTotal = 0;
for (const modelo of MODELOS) {
  for (const v of vinhetas) {
    const args = ['-p', flat('Patient case:\n' + v.texto), '--model', modelo, '--system-prompt', flat(SYSTEM), '--tools', '', '--output-format', 'stream-json', '--verbose',
      '--no-session-persistence', '--permission-prompts', 'none', '--setting-sources', ''];
    const t0 = Date.now();
    const r = spawnSync(CLAUDE, args, { encoding: 'utf8', env, shell: false, timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
    const ms = Date.now() - t0;
    const linhas = (r.stdout || '').split(/\r?\n/).filter(Boolean);
    writeFileSync(`${AQUI}bruto/${modelo}_vinheta${v.id}.jsonl`, linhas.join('\n') + '\n');
    const tipos = {}; let resultado = null; let modeloReal = null;
    for (const l of linhas) {
      let j; try { j = JSON.parse(l); } catch { continue; }
      if (j.type === 'system' && j.model) modeloReal = j.model;
      if (j.type === 'assistant') for (const b of j.message?.content ?? []) tipos[b.type] = (tipos[b.type] ?? 0) + 1;
      if (j.type === 'result') resultado = j;
    }
    const u = resultado?.usage ?? {};
    const custo = resultado?.total_cost_usd ?? 0; custoTotal += custo;
    saida.push({ modelo, modelo_reportado: modeloReal, vinheta: v.id, ms, status_processo: r.status, tipos_de_bloco: tipos, tem_bloco_thinking: !!tipos.thinking || !!tipos.redacted_thinking,
      tokens_out: u.output_tokens ?? null, tokens_in: u.input_tokens ?? null, chaves_usage: Object.keys(u), custo_usd: custo, erro: r.status === 0 ? '' : (r.stderr || '').slice(0, 200) });
    console.log(modelo, 'v' + v.id, 'blocos=' + JSON.stringify(tipos), 'tokens_out=' + (u.output_tokens ?? '?'), 'custo=' + custo);
  }
}
writeFileSync(AQUI + 'sonda_resultado.json', JSON.stringify({ data: new Date().toISOString(), versao_cli: versao, chamadas: saida.length, custo_total_usd: custoTotal, resultados: saida }, null, 2));
console.log('custo total US$', custoTotal.toFixed(4));
