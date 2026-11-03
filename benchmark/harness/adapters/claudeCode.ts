import spawn from 'cross-spawn';
import type { ModelAdapter, ResultadoClassificacao, Vinheta } from '../types';
import { SYSTEM_PROMPT, buildUserPrompt } from '../prompt';
import { parseClassificacao } from '../validate';


// No Windows, o shim 'claude.cmd' roda via cmd.exe por baixo, e o cmd.exe trata
// qualquer \n dentro de um argumento como fim de linha — corta tudo depois dele.
// Por isso achatamos as quebras de linha antes de montar os argumentos do CLI
// (o Groq/API recebem o texto original, com quebras, via HTTP — só o CLI precisa disto).
function flattenForCli(texto: string): string {
  return texto.replace(/\s*\r?\n\s*/g, ' ').trim();
}

// Flags exatas usadas — documentadas também em eval/README.md:
//   -p                               não-interativo, imprime e sai
//   --model <id>                     modelo avaliado (um adaptador por modelo)
//   --system-prompt <texto>          substitui TODO o prompt padrão (sem CLAUDE.md, sem contexto do projeto)
//   --tools ""                       desativa todas as ferramentas (sem Bash/Edit/WebFetch/etc.)
//   --output-format json             saída estruturada (texto final + usage + tempo em um único JSON)
//   --no-session-persistence         não grava a sessão em disco
//   --permission-prompts none        nunca trava esperando aprovação (tools já estão desativadas)
//   --setting-sources ""             ignora settings de user/project/local (sem hooks externos)
const BUILD_ARGS = (model: string, userPrompt: string) => [
  '-p', flattenForCli(userPrompt),
  '--model', model,
  '--system-prompt', flattenForCli(SYSTEM_PROMPT),
  '--tools', '',
  '--output-format', 'json',
  '--no-session-persistence',
  '--permission-prompts', 'none',
  '--setting-sources', '',
];

function cleanEnv(): NodeJS.ProcessEnv {
  // Remove variáveis da sessão PAI do Claude Code — o subprocesso deve se
  // autenticar só pelo CLAUDE_CODE_OAUTH_TOKEN, como uma sessão nova e isolada.
  const {
    CLAUDECODE, CLAUDE_CODE_SESSION_ID, CLAUDE_CODE_ENTRYPOINT, CLAUDE_PID,
    CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_BRIDGE_SESSION_ID, CLAUDE_CODE_MESSAGING_SOCKET,
    CLAUDE_CODE_MESSAGING_TOKEN, CLAUDE_CODE_SSE_PORT, AI_AGENT, CLAUDE_EFFORT,
    ANTHROPIC_API_KEY, // evita conflito: aqui a autenticação deve ser só o setup token
    ...resto
  } = process.env;
  return { ...resto, CLAUDE_CODE_CHILD_SESSION: '1' };
}

export function criarClaudeCodeAdapter(model: string): ModelAdapter {
  return {
  nome: model + '-via-claude-code',

  disponivel() {
    return !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
  },

  async classificar(vinheta: Vinheta): Promise<ResultadoClassificacao> {
    const inicio = Date.now();
    const userPrompt = buildUserPrompt(vinheta);

    return new Promise((resolve) => {
      // cross-spawn resolve o shim .cmd do Windows e escapa os argumentos corretamente
      // (spawn nativo com shell:true concatena sem escapar e corrompe prompts longos).
      const child = spawn('claude', BUILD_ARGS(model, userPrompt), {
        env: cleanEnv(),
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
      }, 60_000);

      child.stdout?.on('data', (d) => { stdout += d.toString(); });
      child.stderr?.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code) => {
        clearTimeout(timeout);
        const tempo_ms_wall = Date.now() - inicio;

        if (code !== 0) {
          resolve({
            tempo_ms: tempo_ms_wall,
            formato_ok: false,
            erro: `claude CLI saiu com código ${code}: ${stderr.slice(0, 300) || stdout.slice(0, 300)}`,
            tipo_erro: 'infra',
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          const textoFinal: string = parsed.result ?? '';
          const classificacao = parseClassificacao(textoFinal) ?? undefined;

          resolve({
            classificacao,
            tempo_ms: parsed.duration_api_ms ?? parsed.duration_ms ?? tempo_ms_wall,
            tokens_in: (parsed.usage?.input_tokens ?? 0) + (parsed.usage?.cache_creation_input_tokens ?? 0) + (parsed.usage?.cache_read_input_tokens ?? 0),
            tokens_out: parsed.usage?.output_tokens,
            custo_usd: parsed.total_cost_usd,
            formato_ok: !!classificacao,
            erro: classificacao ? undefined : `Formato inválido: ${textoFinal.slice(0, 200)}`,
            tipo_erro: classificacao ? undefined : 'formato',
          });
        } catch (e) {
          resolve({
            tempo_ms: tempo_ms_wall,
            formato_ok: false,
            erro: `Saída do claude CLI não é JSON válido: ${stdout.slice(0, 300)}`,
            tipo_erro: 'infra',
          });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          tempo_ms: Date.now() - inicio,
          formato_ok: false,
          erro: `Falha ao executar 'claude': ${err.message}`,
          tipo_erro: 'infra',
        });
      });
    });
  },
  };
}
