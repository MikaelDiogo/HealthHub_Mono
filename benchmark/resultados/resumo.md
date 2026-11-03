# Resumo do Benchmark — HealthHub

Gerado em 14/10/2026, 23:36:55 (horário de Brasília).

> A coluna "acurácia de diagnóstico top-3" só considera linhas cuja coluna `dx_top3_ok` já foi preenchida manualmente em `eval/resultados/<modelo>.csv`. Linhas sem preenchimento ficam de fora da média — a correspondência de texto livre não é decidida por regra automática.

## Por modelo

| Modelo | Acurácia triagem (méd ± dp) | Acurácia diagnóstico top-3 | Consistência | Formato válido | Tempo médio (p95) | Tokens in/out | Custo estimado |
|---|---|---|---|---|---|---|---|
| claude-sonnet-5-via-claude-code | 91.7% ± 0.0pp | — (aguardando conferência manual) (n=0) | 100.0% | 100.0% | 3590ms (5122ms) | 120332/9141 | Groq: conforme plano · Claude Code: não exposto pela CLI por chamada |
| groq | 91.7% ± 0.0pp | — (aguardando conferência manual) (n=0) | 100.0% | 100.0% | 978ms (1322ms) | 38475/33071 | Groq: conforme plano · Claude Code: não exposto pela CLI por chamada |

## Tabela 6 — comparação com a literatura (para o TCC)

| Modelo | Diagnóstico top-3 | Triagem | Fonte |
|---|---|---|---|
| GPT-3 | 88% | 71% | **Literatura** — Levine et al. (2024), *The Lancet Digital Health* |
| Claude 3.5 Sonnet | 100% | 94% | **Literatura** — Sorich et al. (2024), *JMIR* |
| claude-sonnet-5-via-claude-code | — (aguardando conferência manual) | 91.7% | **Medido neste trabalho** (48 vinhetas × 3 repetições) |
| groq | — (aguardando conferência manual) | 91.7% | **Medido neste trabalho** (48 vinhetas × 3 repetições) |

### Limitações (não remover do TCC)

- 48 vinhetas é um conjunto pequeno; a triagem é binária (urgente/não-urgente), não os 5 níveis do Protocolo de Manchester.
- A comparação com GPT-3 e Claude 3.5 Sonnet é indireta: resultados publicados, possivelmente com prompts diferentes dos usados aqui.
- Resultados via Claude Code (subprocesso `claude -p`) aproximam, mas não igualam exatamente, uma chamada direta pela API (overhead do CLI, possíveis diferenças de parâmetros padrão).
- Este benchmark mede o **modelo**, não o sistema HealthHub como um todo, e não substitui avaliação com profissionais de saúde (prevista na DSR do TCC).
- Ollama não está implementado no HealthHub no momento desta avaliação — não entra na comparação.
