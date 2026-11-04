# Benchmark de IA clínica — harness, resultados por chamada e conferência

Cópia versionada do harness que estava em `eval/` (fora do código de produção do HealthHub), com os **CSVs por chamada**. Mede os modelos, não o sistema. As 48 vinhetas vêm de Levine et al. (2024, *The Lancet Digital Health*), as mesmas usadas por Sorich et al. (2024, *JMIR*). **Não é validação clínica.**

## Conteúdo

| Caminho | O que é |
|---|---|
| `harness/` | Código: `runner.ts` (executa), `relatorio.ts` (agrega), `prompt.ts` (o prompt usado), `adapters/` (Groq, Claude via Claude Code CLI, Claude via API), `validate.ts`, `types.ts`, `package.json`/`package-lock.json`, `.env.example` (sem valores), `README.md` e `RELATORIO_BENCHMARK.md` originais |
| `harness/vinhetas.csv` | As 48 vinhetas (id, texto, diagnóstico correto, urgência, triagem original) |
| `resultados/*.csv` | **Um CSV por modelo, com as 144 chamadas** (48 vinhetas × 3 repetições; uma linha por chamada: diagnósticos, urgência, gabarito, `triagem_ok`, `formato_ok`, `tempo_ms`, tokens, custo quando houver) |
| `resultados/claude-sonnet-5-via-claude-code-run1.csv` | Uma execução anterior do Sonnet 5 (144 chamadas), preservada; **não** entra na Tabela 2 |
| `resultados/resumo.md` | Agregado gerado por `npm run relatorio` |

Credenciais, caminhos pessoais e tokens **não** estão aqui (varredura feita; o `.env` original não foi copiado e é ignorado pelo Git).

## Como reproduzir

Requisitos: Node 22 ou superior (testado com 24.20.0), `claude` CLI instalado (para os modelos Claude via Claude Code). **Rodar de novo chama provedores externos e consome créditos/cota.**

```bash
cd benchmark/harness
npm install
cp .env.example .env        # preencha GROQ_API_KEY e CLAUDE_CODE_OAUTH_TOKEN (nunca versionar)
EVAL_LIMIT=2 npm run runner # validação barata (2 vinhetas)
npm run runner              # completo: 48 × 3 por modelo disponível
npm run relatorio           # gera resumo.md (a coluna dx_top3_ok é preenchida à mão antes)
```

Parâmetros fixos no código (conferidos em `adapters/`): Groq `openai/gpt-oss-120b`, `temperature: 0`, `max_tokens: 512`; API da Anthropic (opcional, não usada nos resultados) `temperature: 0`, `max_tokens: 512`; Claude via CLI com `claude -p … --model <id> --system-prompt <prompt> --tools "" --output-format json --no-session-persistence --permission-prompts none --setting-sources ""`. O mesmo prompt vai para todos os modelos (`harness/prompt.ts`).

## Pensamento estendido ("extended thinking") — resposta com a evidência

**O que se sabe pelo código e pelos registros:**

- **Claude Sonnet 5, Claude Sonnet 5.5 e Claude Opus 5.5 (via Claude Code CLI):** o harness **não passa nenhuma configuração de pensamento ou esforço**. Em `harness/adapters/claudeCode.ts` os argumentos do CLI (linhas das flags `BUILD_ARGS`) não incluem flag de esforço/orçamento de pensamento, e a variável `CLAUDE_EFFORT` é **removida** do ambiente do subprocesso (função `cleanEnv`). Portanto não houve configuração explícita de pensamento estendido; **o que o CLI faz por padrão para cada um desses modelos não é determinável a partir do harness**.
- **Indício indireto (inferência, não prova):** os `tokens_out` médios por chamada foram **64** (Sonnet 5), **73** (Sonnet 5.5) e **97** (Opus 5.5; máximo 439 em uma chamada), compatíveis com a resposta visível (um JSON curto com 3 diagnósticos e a urgência), sem sinal de milhares de tokens de raciocínio. Isso sugere que **não houve pensamento estendido relevante**, mas não confirma como o CLI contabiliza tokens de raciocínio.
- **Groq (`openai/gpt-oss-120b`):** o pedido **não envia `reasoning_effort`** (`harness/adapters/groq.ts`: só `temperature: 0` e `max_tokens: 512`), então vale o **padrão do provedor**; o nível padrão não está registrado no harness. `gpt-oss-120b` é um modelo de raciocínio, e o `tokens_out` médio foi **230** (mín 126, máx 392) para uma resposta visível de cerca de 60 a 70 tokens, o que indica que houve tokens de raciocínio contabilizados (inferência).
- O prompt (`harness/prompt.ts`) pede "raciocinar passo a passo internamente" e depois responder só com o JSON. Isso é uma instrução de texto, **não** ativa o recurso de pensamento estendido.

**Verificação direta (04/11/2026, sonda de 9 chamadas, custo US$ 0,07):** com a configuração do harness (CLI 2.1.300, mesmas flags, saída `stream-json`), **os três modelos Claude (Sonnet 5, Sonnet 5.5 e Opus 5.5) NÃO usaram pensamento estendido**: nenhuma resposta teve bloco `thinking`, e o CLI informa `thinking_tokens: 0` (`usage.output_tokens_details`) e `thinkingTokens: 0` (`modelUsage`) em todas as 9 chamadas. Detalhes, limites e arquivos brutos em `evidencias_tcc/rodada_final_2/etapa4_pensamento_estendido/`. Isso substitui a inferência indireta acima para os modelos Claude. **Para o Groq (`gpt-oss-120b`) continua sem verificação direta** (o nível padrão de raciocínio do provedor não está registrado no harness; só a inferência pelos `tokens_out`).

## Conferência da Tabela 2 do TCC (recalculada a partir dos CSVs)

`triagem_ok` = acertos de urgência (urgente × não urgente) em 144 chamadas; tempo = média de `tempo_ms`.

| Modelo (CSV) | Acertos | Tempo médio (ms) | Tabela 2 do TCC | Confere? |
|---|---|---|---|---|
| Groq `gpt-oss-120b` (`groq.csv`) | 132/144 | 978 | 132/144 · 978 | sim |
| Claude Sonnet 5 (`claude-sonnet-5-via-claude-code.csv`) | 132/144 | 3.658 | 132/144 · 3.658 | sim |
| Claude Sonnet 5.5 (`claude-sonnet-5-5-via-claude-code.csv`) | 138/144 | 1.811 | 138/144 · 1.811 | sim |
| Claude Opus 5.5 (`claude-opus-5-5-via-claude-code.csv`) | 137/144 | 2.709 | 137/144 · 2.709 | sim |

Nenhuma diferença encontrada nos acertos nem nos tempos médios (arredondados ao inteiro). A execução anterior do Sonnet 5 (`-run1`) deu 132/144 e 3.590 ms.

**Cuidados na leitura:** o `tempo_ms` dos modelos Claude vem do CLI (`duration_api_ms`, tempo da API), e o do Groq é medido pelo harness; não são exatamente a mesma grandeza. Todas as 144 chamadas de cada modelo tiveram formato válido e nenhum erro de infraestrutura. Custo total registrado (só nos CSVs que têm `custo_usd`): Sonnet 5.5 ≈ US$ 0,63 e Opus 5.5 ≈ US$ 1,35.
