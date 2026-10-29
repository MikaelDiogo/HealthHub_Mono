# 10 — Permissões e validações: correção e prova (29/10/2026)

Base: commit `70190bf` + as mudanças **desta rodada, não commitadas** (patch revisado: `mudancas_desta_rodada.patch`, 23 arquivos). Decisões recebidas: A1–A4, A6 (sem `engines`), cadastro desktop e textos do A5 **aprovados**; **B1a** aprovado; B1b, B2, B3 **não** decididos; **sem commit**.
Legenda: **reproduzido** = teste que falhou antes e passou depois; **só estático** = leitura de código/busca, sem execução que falhe e passe.

## 1. Resultado em números (comandos rodados agora)
| Medida | Antes | Depois | Log |
|---|---|---|---|
| Backend, suíte completa (testes novos incluídos) | **29 falharam** / 55 passaram (84) | **84 passaram**, 0 falharam | `logs/permissoes_antes_backend.log` → `logs/permissoes_depois_backend.log` |
| Linha de base (testes antigos) | 13/13 | 13/13 continuam passando dentro dos 84 | idem |
| Regressão, cópia limpa (`npm ci` + build + teste) — backend | — | `npm ci` 0 · build 0 · **84/84** | `logs/permissoes_regressao_backend.log` |
| Regressão, cópia limpa — frontend | 15/15 | `npm ci` 0 · build 0 (`tsc` sem erros) · **15/15** | `logs/permissoes_regressao_frontend.log` |
| Casos no mock (I01-k, I01-l, I03-d, I01-d/e/f, 503) | ver seção 3 | ver seção 3 | `logs/casos_ia_audio_*` |

## 2. Itens do grupo A
| Item | Estado antes | Mudança (arquivo:linha) | Teste | Saída antes | Saída depois | Não prova |
|---|---|---|---|---|---|---|
| **A1** PUT "Alta" | **Reproduzido**: enfermeiro e recepção conseguiam `status "Alta"` no serviço (fechava visita e inativava o paciente) | `fila/application/update-fila.service.ts:31-35` (403 se `Alta` e perfil ≠ médico); `PATCH …/alta` e `@Roles` inalterados | `update-fila.service.alta.spec.ts` (4) | 2 falham (enfermeiro, recepção) | 4/4 | Que o guard HTTP aplica o `@Roles`; quem **deve** dar alta |
| **A2** sinais vazios | **Reproduzido**: `{}` e campos vazios eram gravados | `sinais-vitais/application/create-sinais-vitais.service.ts:13-18` (400 se FC, SpO₂, PA e temperatura ausentes/vazios); método passou a `async` | `create-sinais-vitais.service.spec.ts` (17) | 2 falham (`{}` e vazios) | 17/17; cada campo sozinho aceito; limites 25–45, 0–100, 0–300 mantidos | Que o `ValidationPipe` global está ativo; valor clínico dos limites |
| **A3** status/gravidade | **Reproduzido**: qualquer texto era aceito | `fila/domain/fila-valores.ts` (novo); `update-fila.dto.ts:7,13`; `create-fila.dto.ts:27`. Status = os 5 da esteira (+ `Alta` só no PUT); gravidade = 5 cores. **Sem mapa de transições** | `fila-dtos.spec.ts` (28) | 11 falham (valores fora da lista aceitos) | 28/28 | Que as transições são válidas (regra clínica não decidida) |
| **A4** IA/áudio | **Reproduzido** (também no mock, seção 3) | `ai/infrastructure/groq-chat.provider.ts:35,39,63-66`; `ai/application/audio-transcription.service.ts:13`; `ai/presentation/ai.controller.ts:33-35,58-60` | `groq-chat.provider.spec.ts` (6), `audio-transcription.service.spec.ts` (3), `ai.controller.spec.ts` (11) | 13 falham | 20/20 | Respostas e erros da Groq **real**; qualidade clínica; modelo e contexto **não foram alterados** |
| **A5** textos | **Só estático** (busca de texto) | `TermosUsoModal/index.tsx:179,223-224,268-277`; `PoliticaDados/index.tsx:79,145-146`; `gerarPDFPolitica.ts:142,166-167,196-197` | busca: 0 ocorrências de Ollama/Qwen/Llama/"modo local"/"data de nascimento" em `HealthHub-Project/src`; build passa | — | — | **Renderização não vista na tela** nesta rodada; não é cláusula jurídica nem base legal. Mantidos "exclusão de prontuários" (`:218`) e as frases genéricas de direitos |
| **A6** README | **Só estático** | `README.md:22`; `HealthHub-BackEnd/Readme.md:13`; `HealthHub-Project/Readme.md:13`: "Node.js 22.12 ou superior (testado em 24.20.0)" | — | — | — | **Não testei Node 20 nem 22.** Piso 22.12 vem do `engines` do Vitest 5. `engines` nos `package.json` **não** foi acrescentado (não aprovado) |
| Cadastro desktop | **Só estático** (o 400 com só FC preenchida não foi reproduzido pela tela) | `HealthHub-Project/src/components/Buttons/index.tsx:159-162` (`\|\| undefined`) | build e 15/15 passam | — | — | Que o fluxo na tela funciona; sem teste de interface |

## 3. Mock do provedor: antes × depois (resposta simulada, não do modelo real)
| Caso | Antes | Depois |
|---|---|---|
| I01-k `patientContext` nulo | **500** `Internal server error` | **201** resposta simulada |
| I01-l sem `message` | **201** (aceito) | **400** `Informe a pergunta para o assistente.` |
| I03-d áudio de 0 byte | **201** (enviado ao provedor) | **400** `O arquivo de áudio está vazio.` |
| I01-d / I01-e / I01-f (429, 500, timeout simulados) | 500 **com** `detail` (corpo do provedor) | 500 `{"error":"Assistente clínico indisponível."}` **sem** `detail` (o log do servidor segue registrando) |
| Chat sem chave | 503 `GROQ_API_KEY não configurada no .env.` | 503 `Assistente clínico não configurado neste ambiente.` |
| Áudio sem chave | 503 `…Adicione GROQ_API_KEY no arquivo .env.` | 503 `Transcrição de áudio não configurada neste ambiente.` |

Nenhuma chamada real à Groq; modo sem chave: 0 chamadas ao provedor simulado.

## 4. Grupo B
| Item | Feito nesta rodada | Estado |
|---|---|---|
| **B1a** `PATCH patients/:id/visitas/fechar` só médico | `visitas.controller.ts:22` `@Roles('medico')`; teste `visitas.controller.spec.ts` (**reproduzido**: antes sem `@Roles`, depois `['medico']`) | **Feito.** Não prova o guard HTTP. A interface não usa essa rota |
| **B1b** `GET patients/:id/visitas` sem `@Roles` | Nada. Registrado em teste como "sem restrição" | **Aguarda decisão.** Restringir quebra o histórico na admissão da recepção (`AdmitirModal:67`) |
| **B2** dados clínicos para a recepção (`GET /patients`, `/metricas`) | Nada | **Aguarda decisão.** DTO reduzido tira alergias do modal de admissão e sinais dos cartões da recepção |
| **B3** `DELETE /fila/:id` sem encerrar visita | Nada | **Aguarda decisão** (qual desfecho gravar) |
| **B4** unicidade da senha | **Medido, sem corrigir** (`logs/b4_concorrencia.json`, banco de teste porta 5435): 2 admissões simultâneas de pacientes diferentes com a mesma senha → **as duas entraram** (2 entradas `PR-900`); 8 admissões simultâneas do **mesmo** paciente → 2 respostas 201 e **2 entradas na fila** do mesmo paciente (6 recusadas por 400). Prova que a checagem "já está na fila" **perde a corrida** e que não há `UNIQUE` | **Aguarda decisão.** Proposta mínima: gerar a senha no backend e criar `UNIQUE` (`senha`, por dia) e `UNIQUE` (`paciente_id`) na fila; exige migration (fora desta rodada). Impacto: a readmissão deixa de reutilizar senha |
| **B5** chat aos 3 perfis | Mantido | Sem mudança |

## 5. Não medido / pendente
- **Não medido:** Node 20 e 22; os testes de A1–A3 foram unitários (sem HTTP/banco); A5 não foi renderizado na tela nem o PDF aberto; o cadastro desktop sem teste de interface; tokens e custo da IA.
- **Pendente (você):** commit e tag (não commitei); `engines` nos `package.json`; B1b, B2, B3 e a correção do B4; troca do nome em `seed.ts:22`; textos jurídicos e base legal da LGPD; o arquivo `evidencias_tcc_HH.zip` na raiz do repositório **não é meu** (não toquei).
- **Continuam abertos (externos):** ensaio de uso com pessoas, ciclos DSR, validação clínica de regras e hipóteses, licença do Manchester, escolha do modelo, benchmark com chamadas reais.
- contagem por arquivo: logs/permissoes_contagem_por_arquivo.txt (soma 4+17+28+6+3+11+2 = 71 novos + 13 antigos = 84)
