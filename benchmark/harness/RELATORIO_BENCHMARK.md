# Relatório de Benchmark — Avaliação de IA Clínica do HealthHub

**Execuções:** 14/10/2026 a 15/10/2026
**Autor:** Mikael Diogo (TCC — ADS)
**Versão:** 2 (atualizada com 4 modelos e análise estatística)
**Escopo:** comparar modelos de linguagem na triagem clínica (urgente × não-urgente) usando as 48 vinhetas publicadas de Levine et al. (2024), com o desenho de prompt de Sorich et al. (2024).

> **Avisos de correção em relação à versão 1 deste relatório** (ver seção 8): (a) o Claude Code CLI **não permite fixar temperatura**, então a afirmação "temperatura 0 igualada" valia só para o Groq; (b) o modelo `claude-sonnet-5-5` **existe** — a primeira rodada usou `claude-sonnet-5` por engano meu.

---

## 1. Origem da pesquisa

### 1.1 As vinhetas
As 48 vinhetas vêm de **Levine et al. (2024)**, *The Lancet Digital Health*: casos clínicos fictícios, em inglês, de apresentação clássica (ex.: *"Chest pain for 1 day. 64-year-old male; Pain is in middle of chest..."*). Cada uma tem dois rótulos:
- `diagnostico_correto` (ex.: "Heart attack");
- `urgente`: `1` para as categorias originais *Emergent* e *1 day*; `0` para *1 week* e *Self-care* (12 vinhetas por categoria).

**Sorich et al. (2024)**, *JMIR* ("The Triage and Diagnostic Accuracy of Frontier Large Language Models: Updated Comparison to Physician Performance"), reutilizaram as mesmas 48 vinhetas com GPT-4o, Claude 3.5 Sonnet e Gemini 1.5 Pro, pedindo os 3 diagnósticos mais prováveis e um nível de urgência.

### 1.2 Números da literatura — o que foi e o que não foi verificado
| Dado | Valor | Verificação |
|---|---|---|
| Claude 3.5 Sonnet, diagnóstico no top-3 | 100% (48/48) | **Verificado** no artigo (Sorich 2024) |
| Claude 3.5 Sonnet, diagnóstico nº 1 | 96% (46/48) | **Verificado** |
| Claude 3.5 Sonnet, triagem | 94% (45/48) | **Verificado** |
| Modelos de fronteira (agrupado), triagem | 92,4% (133/144) | **Verificado** |
| Erro de triagem mais comum | superestimar a urgência | **Verificado** |
| GPT-3 (Levine 2024): 88% diagnóstico, 71% triagem | — | **NÃO verificado por mim** — vem do briefing do TCC; conferir no artigo antes de citar |

### 1.3 Por que vinhetas publicadas
Não se usam dados reais de pacientes por exigência de LGPD/ética em pesquisa. Vinhetas públicas e já usadas por outros grupos são o padrão para comparar modelos de IA em saúde.

---

## 2. Objetivo
O HealthHub usa hoje a API da Groq (`openai/gpt-oss-120b`) no assistente clínico. A pergunta: **essa escolha é defensável, ou um modelo Claude traria ganho mensurável?** O benchmark mede o **modelo isolado** numa tarefa controlada; não mede o sistema HealthHub, a usabilidade, nem substitui a avaliação com profissionais de saúde prevista na etapa DSR do TCC.

---

## 3. Metodologia

### 3.1 Pipeline (`eval/`, fora do código de produção)
`vinhetas.csv` → `prompt.ts` (prompt único) → `adapters/` (um por modelo, mesma interface) → `runner.ts` (48 vinhetas × 3 repetições, gravação linha a linha, retomável) → `validate.ts` (valida o JSON) → `relatorio.ts` (métricas).

### 3.2 Prompt único (idêntico para todos)
Em inglês, no desenho de Sorich: raciocinar internamente, **não exibir o raciocínio**, responder somente com `{"diagnoses":[3 itens], "urgency":"urgent"|"nonurgent"}`. `urgent` = pronto-socorro ou médico em até 1 dia; `nonurgent` = até 1 semana ou autocuidado. Texto integral em `eval/prompt.ts`.

### 3.3 Parâmetros — o que foi e o que NÃO foi igualado
| Parâmetro | Groq | Claude (via Claude Code CLI) |
|---|---|---|
| Prompt de sistema e do usuário | idênticos | idênticos |
| Repetições por vinheta | 3 | 3 |
| **Temperatura** | **0 (fixada)** | **padrão do CLI — não configurável** |
| Ferramentas | n/a | desativadas (`--tools ""`) |
| Contexto extra | nenhum | `--system-prompt` substitui o prompt padrão; sem CLAUDE.md |

A temperatura do Claude **não pôde ser fixada** porque o `claude -p` não expõe esse parâmetro. Isso é uma diferença de desenho entre os grupos e está registrada como limitação (seção 7).

### 3.4 Modelos testados
| Modelo | ID | Acesso | Versão do Claude Code |
|---|---|---|---|
| Groq | `openai/gpt-oss-120b` (o mesmo do HealthHub em produção) | API HTTP direta, temp. 0 | n/a |
| Claude Sonnet 5 | `claude-sonnet-5` | `claude -p`, setup token | 2.1.267 |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | `claude -p`, setup token | 2.1.300 |
| Claude Opus 5.5 | `claude-opus-5-5` | `claude -p`, setup token | 2.1.300 |

**Confundidor:** o Claude Code foi atualizado de 2.1.267 para 2.1.300 **entre** a rodada do Sonnet 5 e as do 5.5/Opus. Diferenças entre o Sonnet 5 e os demais modelos Claude podem ter alguma contribuição da versão do CLI, não só do modelo.

Flags usadas: `-p`, `--model`, `--system-prompt`, `--tools ""`, `--output-format json`, `--no-session-persistence`, `--permission-prompts none`, `--setting-sources ""`. O token de assinatura (setup token) foi usado **somente** neste experimento; em produção o Claude só entraria por chave de API.

### 3.5 Controles de validade
- **Validação de formato sem descarte:** JSON inválido conta como erro (`formato_ok=false`), nunca é ocultado. Resultado: 144/144 válidos em todos os modelos.
- **Retry só para falha de infraestrutura** (rede/processo), nunca para erro de conteúdo — repetir até "dar certo" inflaria a acurácia.
- **Execução retomável:** cada resultado é gravado ao ser produzido. Houve quedas por falta de memória da máquina e processos órfãos que geraram **linhas duplicadas** em uma das rodadas; elas foram removidas (mantida a 1ª ocorrência por vinheta/repetição) e a integridade foi reconferida (144 linhas únicas em cada arquivo final).
- **Gabarito externo:** vem do estudo original, não foi criado para este trabalho.

---

## 4. Resultados — triagem (medida)

48 vinhetas × 3 repetições = 144 chamadas por modelo. Total de chamadas avaliadas: **720** (4 modelos + 1 repetição completa extra do Sonnet 5).

### 4.1 Tabela principal
| Modelo | Acertos | Acurácia | Vinhetas 100% certas (de 48) | IC 95% (Wilson, n=48) | Tempo médio (p95) | Custo reportado pelo CLI |
|---|---|---|---|---|---|---|
| Groq `gpt-oss-120b` | 132/144 | **91,7%** | 44 | 80,4% – 96,7% | 978 ms (1322) | n/d (plano Groq) |
| Claude Sonnet 5 | 132/144 | **91,7%** | 44 | 80,4% – 96,7% | 3658 ms (4860) | não registrado |
| **Claude Sonnet 5.5** | **138/144** | **95,8%** | **46** | 86,0% – 98,8% | 1811 ms (3389) | US$ 0,63 |
| Claude Opus 5.5 | 137/144 | **95,1%** | 45 | 83,2% – 97,9% | 2709 ms (4963) | US$ 1,35 |

Observações: a unidade estatística efetiva é a **vinheta (n=48)** — as 3 repetições não são amostras independentes, por isso os intervalos de confiança usam n=48, não 144. O custo é o que o CLI reporta (não é cobrança de API) e só foi registrado para 5.5 e Opus; a contagem de tokens do Sonnet 5 usou uma versão anterior do adaptador (sem tokens de cache) e **não é estritamente comparável** com a dos demais.

### 4.2 Erros por vinheta
| Vinheta (gabarito) | Groq | Sonnet 5 | Sonnet 5.5 | Opus 5.5 |
|---|---|---|---|---|
| 21 Mononucleose (urgente) | ✗✗✗ | ✓ | ✓ | ✗✗ (2/3) |
| 23 Herpes-zóster (urgente) | ✗✗✗ | ✓ | ✓ | ✓ |
| 24 ITU (urgente) | ✓ | ✗✗✗ | ✓ | ✓ |
| 26 Sinusite (não-urgente) | ✓ | ✗✗✗ | ✓ | ✓ |
| **29 Diabetes (não-urgente)** | ✗✗✗ | ✗✗✗ | ✗✗✗ | ✗✗ (2/3) |
| **34 Insuf. cardíaca (não-urgente)** | ✗✗✗ | ✗✗✗ | ✗✗✗ | ✗✗✗ |

### 4.3 Direção dos erros (superestimar × subestimar urgência)
| Modelo | Sobre-triagem | Sub-triagem |
|---|---|---|
| Groq | 6 | 6 |
| Sonnet 5 | 9 | 3 |
| Sonnet 5.5 | 6 | 0 |
| Opus 5.5 | 5 | 2 |
| **Total** | **26 (70%)** | **11 (30%)** |

---

## 5. Resultados — diagnóstico (RASCUNHO, não oficial)
A coluna oficial `dx_top3_ok` continua **vazia** nos 4 arquivos: a conferência definitiva exige julgamento clínico humano. O que existe é um **rascunho** gerado por `eval/dx_rascunho.ts`, gravado à parte em `eval/resultados/dx_rascunho.csv`.

**Como o rascunho foi feito:** para cada uma das 48 vinhetas foi definida uma lista de termos aceitos (o diagnóstico do gabarito e sinônimos diretos, ex.: "myocardial infarction" para "Heart attack"), derivada **só do gabarito** e aplicada igualmente aos 4 modelos. Há dois níveis: *forte* (o diagnóstico ou sinônimo direto aparece) e *revisar* (aparece só causa ou condição relacionada). As listas foram escritas por uma IA (Claude), não por um profissional de saúde.

| Modelo | Top-3 (forte) | Top-3 (forte + revisar) | Top-1 (forte) | Top-3 por repetição |
|---|---|---|---|---|
| Groq | 141/144 (97,9%) | 141/144 (97,9%) | 138/144 (95,8%) | 47/47/47 |
| Claude Sonnet 5 | 144/144 (100%) | 144/144 (100%) | 138/144 (95,8%) | 48/48/48 |
| Claude Sonnet 5.5 | 143/144 (99,3%) | 144/144 (100%) | 141/144 (97,9%) | 48/47/48 |
| Claude Opus 5.5 | 144/144 (100%) | 144/144 (100%) | 139/144 (96,5%) | 48/48/48 |

**Linhas não confirmadas como "forte" (as únicas 3 distintas, todas na vinheta 18, gabarito: síndrome hemolítico-urêmica):**
- Groq (3 de 3 repetições): sugeriu Shigella / gastroenterite bacteriana, colite ulcerativa, intussuscepção ou doença inflamatória intestinal. A SHU não aparece. Marcado `false`.
- Sonnet 5.5 (1 repetição): sugeriu colite hemorrágica por *E. coli* produtora de toxina Shiga, que é a causa da SHU, mas não a SHU em si. Marcado `revisar`; decisão clínica.

**Como ler isso:**
- O diagnóstico no top-3 está em **~98–100% nos quatro modelos**, o que é compatível com os 100% (48/48) e os 96% de top-1 que Sorich et al. reportam para o Claude 3.5 Sonnet. O top-1 aqui (95,8–97,9%) também é compatível com os 96% do artigo.
- Há **efeito teto**: com todos perto de 100%, essa métrica **não distingue os modelos**. A diferença inteira entre eles é de 1 vinheta (a 18).
- O critério é **leniente por desenho** (top-3, sinônimos aceitos). Um critério mais estrito de um clínico pode reduzir os números.
- As falhas de top-1 **não foram lidas uma a uma**: podem ser o diagnóstico correto em 2º ou 3º lugar, ou um sinônimo ausente das listas.
- **Estatus:** rascunho. Não deve ser citado como acurácia diagnóstica medida até a revisão de um profissional de saúde.

---

## 6. O que os resultados indicam ou comprovam

### 6.1 Comprovado (sustentado pelos dados)
1. **O pipeline é confiável.** 720 chamadas, 100% de formato válido, sem descarte; resultados reconferidos linha a linha e deduplicados.
2. **Os quatro modelos acertam a grande maioria das triagens** (91,7% a 95,8%) — na mesma faixa do 94% do Claude 3.5 Sonnet e dos 92,4% agrupados dos modelos de fronteira publicados por Sorich et al. A faixa observada é coerente com a literatura.
3. **Não há diferença estatisticamente significativa entre os modelos.** Testes de sinal exato, pareados por vinheta: Sonnet 5.5 × Groq 2 a 0 (p = 0,50); Sonnet 5.5 × Sonnet 5 2 a 0 (p = 0,50); Sonnet 5.5 × Opus 5.5 1 a 0 (p = 1,00); Opus 5.5 × Groq 1 a 0 (p = 1,00). Os ICs de 95% se sobrepõem amplamente. A diferença de ~4 pontos entre Groq e Sonnet 5.5 corresponde a **2 vinhetas** em 48.
4. **O Opus 5.5 não superou o Sonnet 5.5**, custando ~2,1× mais (US$ 1,35 × US$ 0,63) e sendo ~1,5× mais lento. Neste teste, pagar mais pelo modelo maior não trouxe ganho mensurável.
5. **As vinhetas 29 e 34 foram erradas pelos quatro modelos**, em todas (ou quase todas) as repetições. Isso aponta para uma dificuldade **do item** (caso de fronteira entre urgente e não-urgente), não de um modelo específico.
6. **Reprodutibilidade (Sonnet 5):** duas execuções independentes produziram urgência **idêntica em 144/144 chamadas**. O Groq, em contraste, deu 89,6% numa execução anterior e 91,7% na final (mesmo modelo, mesmo prompt, temperatura 0); o arquivo bruto da execução de 89,6% não foi preservado. O Opus 5.5 foi o único com instabilidade **dentro** de uma execução (vinhetas 21 e 29 mudaram de urgência entre repetições).

### 6.2 Indicado, mas NÃO comprovado
- **Tendência de sobre-triagem:** 70% dos erros agregados foram de superestimar a urgência, o que é coerente com a literatura. Porém: (a) o Groq errou metade para cada lado (6 × 6); (b) a maior parte da sobre-triagem vem de apenas 3 vinhetas (26, 29, 34). Com tão poucos itens, é um padrão sugestivo, não uma lei.
- **Sonnet 5.5 como o mais preciso:** foi o melhor em número absoluto e o único sem sub-triagem, mas a diferença não é significativa (item 3).
- **Que 29 e 34 tenham gabarito discutível:** é uma hipótese plausível (os 4 modelos concordam entre si contra o gabarito), mas só um profissional de saúde pode julgar. Concordância entre modelos não é prova de que o gabarito está errado.

### 6.3 NÃO comprovado (não afirmar no TCC)
- Que algum modelo seja **superior** a outro em triagem.
- Qualquer conclusão firme sobre **acurácia diagnóstica**: só existe o rascunho da seção 5, não revisado por profissional de saúde, e com efeito teto que não distingue os modelos.
- Segurança clínica, utilidade real ou aceitação por profissionais — o benchmark mede o modelo, não o sistema.
- Desempenho com os **5 níveis de Manchester** (a triagem aqui é binária) ou com casos reais, ambíguos e em português.
- Que os modelos não tenham visto as vinhetas no treinamento (são públicas desde 2023; contaminação possível e não testada).

---

## 7. Limitações
- **Amostra:** 48 vinhetas, de apresentação clássica; triagem binária.
- **Temperatura desigual:** fixada em 0 no Groq, padrão do CLI nos modelos Claude (3.3).
- **Versão do CLI diferente** entre Sonnet 5 e os demais (3.4).
- **Acesso via Claude Code CLI**, não via API: há overhead de contexto interno do CLI e o comportamento pode não igualar uma integração de produção.
- **Custos não comparáveis:** só existem para 5.5 e Opus; para o Groq depende do plano.
- **Comparação indireta com a literatura:** resultados publicados, com prompts possivelmente diferentes; o 71% do GPT-3 não foi verificado.
- **Execução em ambiente instável:** quedas por memória e processos órfãos exigiram deduplicação manual (documentada em 3.5).
- **Ollama:** não existe no HealthHub, portanto não entra na comparação; o teste de fallback entre provedores foi removido do escopo por decisão do autor.
- **Diagnóstico top-3 em rascunho** (seção 5): critério leniente, listas de termos escritas por IA, sem revisão clínica.

---

## 8. Registro de correções feitas durante o experimento
1. **Modelo "Sonnet 5.5":** o briefing pedia `claude-sonnet-5-5`; foi inicialmente afirmado, por engano, que o ID não existia, e usou-se `claude-sonnet-5`. O ID existe e foi testado depois (seção 4).
2. **Temperatura:** a v1 deste relatório dizia que a temperatura 0 foi igualada nos dois modelos. Isso é **falso** para os modelos Claude via CLI (3.3).
3. **Contagem de tokens:** o adaptador inicial ignorava os tokens de cache e o custo reportado pela CLI; ambos foram corrigidos antes das rodadas do Sonnet 5.5 e do Opus 5.5.
4. **Duplicatas:** linhas duplicadas por processos órfãos foram removidas (3.5).
5. **Afirmação anterior sobre sobre-triagem:** uma conclusão preliminar ("o erro residual dos LLMs tende a ser conservador") foi refinada para a versão da seção 6.2, mais cautelosa.

---

## 9. Dados brutos
`eval/vinhetas.csv` · `eval/resultados/groq.csv` · `claude-sonnet-5-via-claude-code.csv` (+ `-run1.csv`) · `claude-sonnet-5-5-via-claude-code.csv` · `claude-opus-5-5-via-claude-code.csv` · `eval/resultados/resumo.md` (tabela gerada por `relatorio.ts`) · `eval/README.md` (execução). Todos os números deste relatório podem ser recalculados a partir desses CSVs.

## 10. Fontes
- Sorich et al. (2024), *JMIR* — https://www.jmir.org/2024/1/e67409 · https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11662182/
- Levine et al. (2024), *The Lancet Digital Health* (vinhetas originais) — referenciado, não reconsultado nesta rodada.
