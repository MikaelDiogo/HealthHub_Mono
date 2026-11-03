# Benchmark de IA clínica — HealthHub

Harness **fora do código de produção** para comparar modelos de IA em vinhetas clínicas
fictícias (Levine et al., 2024, *The Lancet Digital Health* — mesmas 48 vinhetas usadas
por Sorich et al., 2024, *JMIR*). Mede o modelo, não o sistema.

## ⚠️ Regra que não pode ser quebrada

O `CLAUDE_CODE_OAUTH_TOKEN` usado aqui é **só para esta avaliação**. Ele autentica o
`claude` CLI como se fosse uma sessão interativa sua (plano Free/Pro/Max) — a Anthropic
proíbe usar esse tipo de credencial para rotear tráfego de um produto/serviço. O backend
do HealthHub **nunca** deve ler essa variável. Se um dia o HealthHub usar Claude como
provedor de produção, é com `ANTHROPIC_API_KEY` (chave do Console), como terceiro
provedor opcional ao lado de Groq — e só mediante confirmação explícita.

## Setup

```bash
cd eval
npm install
cp .env.example .env
```

Preencha `eval/.env`:

| Variável | Obrigatória? | Como obter |
|---|---|---|
| `GROQ_API_KEY` | Sim (adaptador Groq) | Mesmo valor de `HealthHub-BackEnd/.env` |
| `CLAUDE_CODE_OAUTH_TOKEN` | Sim (adaptador Claude via Claude Code) | Rode `claude setup-token` no seu terminal, siga o login no navegador, cole o token aqui |
| `ANTHROPIC_API_KEY` | Não (adaptador Claude via API, roda só se existir) | Console da Anthropic (console.anthropic.com) |
| `EVAL_LIMIT` | Não | Número de vinhetas a rodar (ex. `2`) — útil pra validar o pipeline sem gastar o run inteiro |

## Rodando

```bash
# Validação barata do pipeline (2 vinhetas, só os modelos com credencial configurada)
EVAL_LIMIT=2 npm run runner

# Run completo (48 vinhetas × 3 repetições × modelos disponíveis)
npm run runner

# Depois de preencher manualmente a coluna dx_top3_ok nos CSVs gerados:
npm run relatorio
```

Saída: `eval/resultados/<modelo>.csv` (um por modelo) e, após `npm run relatorio`,
`eval/resultados/resumo.md` com as métricas e a Tabela 6 para o TCC.

## Adaptadores e exatamente o que cada um faz

### Groq (`adapters/groq.ts`)
Mesmo modelo e endpoint já usados em produção
(`HealthHub-BackEnd/src/modules/ai/application/clinical-chat.service.ts`):
`openai/gpt-oss-120b` via `https://api.groq.com/openai/v1/chat/completions`,
`temperature: 0`.

### Claude Sonnet 5 via Claude Code (`adapters/claudeCode.ts`)
Chama `claude -p` por subprocesso (`child_process.spawn`), autenticado só por
`CLAUDE_CODE_OAUTH_TOKEN` (as demais variáveis de sessão do Claude Code pai são
removidas do ambiente do filho, para isolar a chamada). Flags exatas usadas:

```
claude -p "<caso clínico>" \
  --model claude-sonnet-5 \
  --system-prompt "<prompt do eval/prompt.ts>" \
  --tools "" \
  --output-format json \
  --no-session-persistence \
  --permission-prompts none \
  --setting-sources ""
```

- `--system-prompt` substitui **todo** o prompt padrão (sem CLAUDE.md, sem info do
  diretório/git) — confirmado pela própria ajuda do CLI, que diz que
  `--exclude-dynamic-system-prompt-sections` "só se aplica com o prompt padrão
  (ignorado com `--system-prompt`)", ou seja, usar `--system-prompt` já descarta
  as seções dinâmicas.
- `--tools ""` desativa Bash/Edit/WebFetch/etc. — o modelo só pode responder texto.
- `--setting-sources ""` ignora configurações de user/project/local (hooks, etc.)
  que pudessem interferir na resposta.
- Não usamos `--bare`: esse modo força autenticação só por `ANTHROPIC_API_KEY`
  (o próprio `--help` diz que em modo bare "OAuth e keychain nunca são lidos"),
  o que quebraria justamente o uso do setup token que este benchmark pede.
- A saída `--output-format json` traz num único objeto: texto final (`result`),
  `usage.input_tokens`/`usage.output_tokens` e `duration_ms`/`duration_api_ms` —
  por isso não precisamos medir tokens/tempo por fora.

### Claude Sonnet 5 via API (`adapters/anthropicApi.ts`) — opcional
Só roda se `ANTHROPIC_API_KEY` existir. Chama `https://api.anthropic.com/v1/messages`
diretamente (sem SDK, mesmo padrão dos outros adaptadores), `claude-sonnet-5`,
`temperature: 0`.

## Prompt único (justo para os três modelos)

Ver `eval/prompt.ts`. Em inglês, pede raciocínio interno passo a passo, mas a saída
visível deve ser **somente** o JSON:
```json
{"diagnoses": ["...", "...", "..."], "urgency": "urgent" | "nonurgent"}
```
`urgent` = pronto-socorro ou médico em até 1 dia. `nonurgent` = médico em até 1 semana
ou autocuidado — mesma definição binária de Sorich et al.

## Validação de formato e retries

`eval/validate.ts` tenta `JSON.parse` direto e, se falhar, extrai o primeiro bloco
`{...}` do texto (alguns modelos envolvem a resposta em ```` ```json ```` mesmo
instruídos a não fazer). Falha de **conteúdo** (JSON inválido) é **registrada como
erro de formato** (`formato_ok=false`), nunca descartada nem repetida. Só falhas de
**infraestrutura** (timeout, rede, processo não iniciou) são repetidas — até 2 vezes,
com espera crescente (2s, 4s).

## O que falta (gaps encontrados no repositório, não inventados)

- **Não existe Ollama no HealthHub** — nem código, nem serviço rodando localmente
  (`localhost:11434` não responde). O adaptador Ollama e o teste de fallback foram
  **removidos do escopo** por decisão do autor (14/10/2026); a comparação é só
  Groq vs. Claude Sonnet 5.
- **"Claude Sonnet 5.5"** citado no briefing original não corresponde a nenhum
  modelo real; usamos `claude-sonnet-5` (modelo atual da família Claude 5),
  confirmado com o autor.

## Custo estimado

- **Claude Sonnet 5 via API**: US$ 2,00 / milhão de tokens de entrada, US$ 10,00 /
  milhão de saída (ver `CUSTO_USD_POR_TOKEN_IN/OUT` em `adapters/anthropicApi.ts`).
  Calculado automaticamente no `resumo.md`.
- **Claude Sonnet 5 via Claude Code**: consome a cota do seu plano
  (Free/Pro/Max) por trás do setup token — a CLI não expõe custo em dólares por
  chamada nesse modo (só expõe quando autenticado por API key). Registre aqui
  quantas chamadas o seu plano suportou sem erro de limite, se acontecer.
- **Groq**: conforme o plano Groq já em uso pelo HealthHub.

## Limitações a manter no TCC (não remover)

- 48 vinhetas é um conjunto pequeno; a triagem é binária (não os 5 níveis de Manchester).
- A comparação com GPT-3 e Claude 3.5 Sonnet é indireta — resultados publicados, com
  prompts possivelmente diferentes dos usados aqui.
- Resultados via Claude Code aproximam, mas não igualam, a chamada direta por API.
- Este benchmark mede o modelo, não o sistema HealthHub, e não substitui avaliação com
  profissionais de saúde prevista na DSR do TCC.
