# 08 — Reprodutibilidade do benchmark

**Escopo:** T8. Só leitura. O benchmark **não foi rodado** (envolve chamadas pagas/assinatura). Não abri `eval/.env`. Os números abaixo foram **recalculados agora a partir dos CSVs existentes** (leitura local), sem chamar nenhum provedor.

## 1. O que existe (em `C:\Users\642mi\Documents\HealthHub_Mono\eval\`)
| Peça | Caminho | Observação |
|---|---|---|
| Harness (executor) | `eval/runner.ts` | 3 repetições por vinheta (`:10`), retomada sem refazer o que já foi salvo (`:52-57`, `:98-110`), concorrência 3 (`:61`), retry só para falha de infraestrutura, até 2 vezes (`:11-12`, `:30-44`) |
| Adaptadores | `eval/adapters/groq.ts`, `claudeCode.ts`, `anthropicApi.ts` | Groq: `openai/gpt-oss-120b`, `temperature: 0`, `max_tokens: 512`, timeout 30 s. Claude: `claude -p` por subprocesso com `--model`, `--system-prompt`, `--tools ""`, `--output-format json`, `--no-session-persistence`, `--permission-prompts none`, `--setting-sources ""` |
| Prompt | `eval/prompt.ts` | em inglês; saída somente em JSON `{diagnoses[3], urgency}`; o prompt também foi copiado em `coleta_tcc/anexos/benchmark/prompt.ts` |
| Validação de formato | `eval/validate.ts` | JSON direto ou primeiro bloco `{...}`; formato inválido é registrado, não repetido |
| Relatório automático | `eval/relatorio.ts` | lê todos os `eval/resultados/*.csv` (`:107`) e gera `resumo.md` |
| Vinhetas | `eval/vinhetas.csv` | 48 vinhetas + cabeçalho (49 linhas); campos `id, vinheta, diagnostico_correto, urgente, triagem_original`; origem Levine et al. (2024) via Sorich et al. (2024) |
| CSVs por chamada | `eval/resultados/` | `groq.csv`, `claude-sonnet-5-via-claude-code.csv`, `claude-sonnet-5-via-claude-code-run1.csv`, `claude-sonnet-5-5-via-claude-code.csv`, `claude-opus-5-5-via-claude-code.csv` (144 linhas cada) |
| Conferência de diagnóstico | `eval/dx_rascunho.ts` e `eval/resultados/dx_rascunho.csv` | **rascunho**, não oficial |
| Relatório | `eval/RELATORIO_BENCHMARK.md` (v2), `eval/README.md`, `eval/resultados/resumo.md`, `Teste_Bench.md` (prompt de execução) | |
| Controle de versão | **nada disso está no Git**: `eval/` e `Teste_Bench.md` aparecem como não rastreados (`git status`); `.gitignore` ignora só `eval/.env` e `eval/node_modules` |

## 2. Lastro dos números do TCC (recalculado dos CSVs agora)
| Modelo | Acertos de triagem (CSV) | % | Tokens in/out somados | `custo_usd` somado no CSV | Linhas únicas / duplicadas |
|---|---|---|---|---|---|
| Groq `gpt-oss-120b` | 132/144 | 91,7% | 38.475 / 33.071 | 0 | 144 / 0 |
| Claude Sonnet 5 | 132/144 | 91,7% | 121.893 / 9.189 | 0 | 144 / 0 |
| Claude Sonnet 5 (`-run1`) | 132/144 | 91,7% | 120.332 / 9.141 | 0 | 144 / 0 |
| Claude Sonnet 5.5 | 138/144 | 95,8% | 134.133 / 10.514 | 0,6339 | 144 / 0 |
| Claude Opus 5.5 | 137/144 | 95,1% | 133.557 / 13.983 | 1,3470 | 144 / 0 |

- **Têm lastro em CSV:** 91,7% (Groq), 91,7% (Sonnet 5), 95,8% (Sonnet 5.5), 95,1% (Opus 5.5); tempos médios; tokens; custos US$ 0,63 e US$ 1,35 (somas do CSV = 0,6339 e 1,3470, **custo reportado pela CLI**, não cobrança de API).
- **Só no relatório, sem CSV ou script no repositório:**
  - o **89,6%** do Groq em "execução anterior" (`RELATORIO_BENCHMARK.md`, seção 6.1, item 6): o CSV dessa execução não existe;
  - intervalos de confiança de Wilson (n=48), "vinhetas 100% certas (de 48)", erros por vinheta e direção dos erros (seções 4.1–4.3): derivam dos CSVs, mas **não há script** que os gere (`relatorio.ts` não calcula Wilson);
  - **diagnóstico top-3** (seção 5): é rascunho; a coluna `dx_top3_ok` dos CSVs por modelo está **vazia** (conferência manual não feita) e `resumo.md` diz "aguardando conferência manual";
  - comparação com literatura (GPT-3 88%/71%, Claude 3.5 Sonnet 100%/94%): vem dos artigos, não foi verificada aqui.

## 3. Lacunas para reproduzir
1. **Credenciais:** `eval/.env` com `GROQ_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN` (setup token, só para a avaliação), `ANTHROPIC_API_KEY` opcional. O nome dessas variáveis está em `eval/.env.example`; valores não foram abertos.
2. **Variável não documentada:** `EVAL_MODELOS_CLAUDE` (`runner.ts:126`, padrão `claude-sonnet-5,claude-sonnet-5-5,claude-opus-5-5`) não aparece no `README` nem no `.env.example`.
3. **Versão da CLI:** Sonnet 5 rodou com Claude Code 2.1.267; Sonnet 5.5 e Opus com 2.1.300 (`RELATORIO_BENCHMARK.md` 3.4) — confundidor declarado. Versão atual da CLI na máquina: **não verificada** (não executei `claude`).
4. **Parâmetros não igualados:** Groq com temperatura 0 e `max_tokens` 512; CLI Claude com temperatura padrão e sem `max_tokens` configurável (relatório 3.3). O app usa `max_tokens` 1024 e não fixa temperatura (`groq-chat.provider.ts:8,49`).
5. **Pareamento/deduplicação:** não existe etapa explícita. A única deduplicação é a retomada por `id-repetição` dentro de um CSV (`runner.ts:52-57`). `relatorio.ts` lê **todos** os CSVs da pasta (`:107`), então `…-run1.csv` seria tratado como outro modelo; não há pareamento entre `run1` e a rodada final. Recalculei: 0 linhas duplicadas em todos os CSVs.
6. **`resumo.md` desatualizado:** foi gerado em 14/10/2026 23:36 e só lista Groq e Sonnet 5; não inclui Sonnet 5.5 nem Opus 5.5. Os números atuais estão apenas em `RELATORIO_BENCHMARK.md`.
7. **Documentação interna contraditória:** `eval/README.md` ainda diz que "Claude Sonnet 5.5 não corresponde a nenhum modelo real" e cita `clinical-chat.service.ts` como origem do modelo do app, mas existem CSV e relatório do Sonnet 5.5, e o provedor hoje está em `groq-chat.provider.ts`. `Teste_Bench.md` fala em `runner.py`; o código é TypeScript (`runner.ts`).
8. **Direitos das vinhetas:** `vinhetas.csv` reproduz casos de Levine et al. (2024); a permissão de redistribuição **não foi confirmada**. Por isso as vinhetas e os CSVs (que trazem o gabarito) não foram incluídos nos anexos do pacote anterior.
9. **Acesso por assinatura:** o custo e o consumo vêm do Claude Code sob um token de assinatura; não equivalem a uma chamada por API.

## 4. Para reproduzir (sem rodar agora)
`cd eval && npm install && cp .env.example .env` (preencher), depois `npm run runner` (48 vinhetas × 3 repetições × modelos disponíveis) e `npm run relatorio`. **Cada execução completa gera chamadas pagas/de cota; só com autorização explícita do autor.** Alternativa sem custo: recalcular as métricas dos CSVs já existentes (feito na seção 2).

## 5. Dúvidas para o autor
- Há CSV ou registro da execução do Groq com 89,6%?
- Quer versionar `eval/` (sem `.env` e sem as vinhetas, enquanto os direitos não forem confirmados)?
- Vai conferir manualmente o `dx_top3_ok` ou o diagnóstico fica como rascunho no TCC?
