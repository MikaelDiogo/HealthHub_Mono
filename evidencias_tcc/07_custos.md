# 07 — Custos reais de uso (somente o que se mede sem gastar)

**Escopo:** T7 do prompt de pendências. Só leitura de código e configuração. **Nenhuma chamada à Groq foi feita**, nenhum preço foi consultado ou citado, e nenhum número de custo foi estimado.
**Versão:** commit `ef1f7e9f26a8e19f475fb056b1839b4b1f75e172` + alterações não commitadas (árvore de trabalho de 29/10/2026). As linhas abaixo foram conferidas no código atual.

## 1. O que o código define (mensurável localmente)

### 1.1 Chat com a IA (`POST /patients/:id/chat`)
| Item | Valor no código | Onde |
|---|---|---|
| Endpoint do provedor | `https://api.groq.com/openai/v1/chat/completions` | `HealthHub-BackEnd/src/modules/ai/infrastructure/groq-chat.provider.ts:6` |
| Modelo | `openai/gpt-oss-120b`, fixo no código (não vem de variável de ambiente) | `groq-chat.provider.ts:7` |
| `max_tokens` (teto de saída por chamada) | 1024 | `groq-chat.provider.ts:8`, enviado em `:49` |
| Temperatura | **não definida** (o corpo enviado tem só `model`, `max_tokens`, `messages`) | `groq-chat.provider.ts:49` |
| Timeout | 30000 ms | `groq-chat.provider.ts:55` |
| Chave | `process.env.GROQ_API_KEY`; sem ela responde 503 | `groq-chat.provider.ts:33-36` |
| Fallback para outro provedor | não existe | — |
| Uso de `usage` (tokens) devolvido pela Groq | **ignorado**: o código lê só `choices[0].message.content` | `groq-chat.provider.ts:59-60` |

### 1.2 O que entra no contexto enviado
O corpo da chamada é `[system (prompt fixo + dados do paciente), ...histórico, pergunta]` (`groq-chat.provider.ts:38-44`).
- **Prompt de sistema fixo:** `buildSystemPrompt`, `groq-chat.provider.ts:10-28` (7 regras). Tamanho em tokens: **não medido** (exigiria o tokenizador do provedor).
- **Dados do paciente no prompt:** nome, alergias, medicamentos, anamnese e os 4 sinais vitais (`:14-18`). O contexto vem **do navegador** (`body.patientContext`), não do banco (`ai.controller.ts:32-33`).
- **Histórico:** o backend **não limita** a quantidade; o limite de 4 mensagens está no **frontend**: `messages.slice(-4)` em `HealthHub-Project/src/pages/Monitoring/index.tsx:108`. Uma chamada direta à API pode enviar mais.
- **Tamanho máximo do corpo da requisição:** `json({ limit: '10kb' })` e `urlencoded({ limit: '10kb' })` em `HealthHub-BackEnd/src/main.ts:27-28`. Esse é o teto prático de **tudo** o que o cliente envia ao chat (mensagem + contexto + histórico). Efeito colateral a verificar: uma anamnese longa somada ao histórico pode estourar 10 KB e a requisição seria recusada antes de chegar à IA (dedução do código, **não testada**).
- **Limites dos campos armazenados** (`create-patient.dto.ts`): alergias 1000 caracteres (`:48`), medicamentos 1000 (`:53`), anamnese 5000 (`:58`), endereço 300 (`:43`). O contexto do chat não passa por esses limites (o corpo do chat não tem DTO de classe: `ChatBody` é uma interface, `ai.controller.ts:17-21`).

### 1.3 Transcrição de áudio (`POST /patients/:id/chat/audio`)
| Item | Valor | Onde |
|---|---|---|
| Endpoint | `https://api.groq.com/openai/v1/audio/transcriptions` | `audio-transcription.service.ts:5` |
| Modelo | `whisper-large-v3-turbo`, idioma `pt`, `response_format=json` | `audio-transcription.service.ts:23-25` |
| Tamanho máximo do arquivo | 25 MB (`25 * 1024 * 1024`) | `ai.controller.ts:41` |
| Armazenamento | em memória (`memoryStorage`), sem gravar em disco | `ai.controller.ts:40` |
| Tipo aceito | qualquer `mimetype` que comece com `audio/`; outro tipo → 400 | `ai.controller.ts:42-47` |
| Sem arquivo | 400 "Nenhum arquivo de áudio enviado." | `ai.controller.ts:52-54` |
| Timeout | 30000 ms | `audio-transcription.service.ts:32` |
| Duração do áudio | **não é medida nem registrada** pelo backend | — |
| Limite de 10 KB do `main.ts` | não se aplica ao `multipart` (só a JSON e urlencoded); o limite aplicável é o de 25 MB do multer | `main.ts:27-28` × `ai.controller.ts:41` |

### 1.4 O que é registrado em log
- **Prompts e respostas da IA não são logados.**
- `groq-chat.provider.ts:64`: em caso de erro, `console.error` com o status e o **corpo de erro devolvido pela Groq** (`JSON.stringify(detail)`); esse mesmo `detail` também volta ao cliente na resposta 500 (`:65`).
- `audio-transcription.service.ts:37`: em caso de erro, só `err.message`.
- Em desenvolvimento, o TypeORM registra **todas as consultas SQL com parâmetros** (`logging: !isProduction`, `HealthHub-BackEnd/src/config/typeorm.config.ts:24`; `src/database/data-source.ts:33`). Isso inclui dados de pacientes gravados, mas não o conteúdo do chat (que não é persistido).
- **Não há registro de tokens consumidos** nem de duração de áudio: sem instrumentação, o consumo real não pode ser medido em operação. (Proposta mínima, sem implementar: registrar `response.data.usage` em `groq-chat.provider.ts:59`, sem o texto.)

## 2. O que NÃO foi medido (e por quê)
| Item | Situação |
|---|---|
| Tokens de entrada e de saída por pergunta | **não medido**: exigiria chamada real à Groq (ou tokenizador do modelo). |
| Duração média do áudio | **não medido**: não há áudio real de teste, e o backend não registra duração. |
| Latência real da Groq no app | **não medido** nesta tarefa. |
| Custo em moeda de qualquer item | **não calculado**: faltam preços e volumes (seção 3). |

**Números do benchmark não servem como custo do app.** Os tokens e tempos de `eval/resultados/*.csv` vêm de outro prompt (em inglês, `eval/prompt.ts`), com `max_tokens` 512 e `temperature: 0` (`eval/adapters/groq.ts`), sobre 48 vinhetas. O app usa 1024 e não fixa temperatura. Os valores em US$ do benchmark são **custo reportado pela CLI do Claude Code** em assinatura (Sonnet 5.5 US$ 0,63; Opus 5.5 US$ 1,35), **não são cobrança de API** e não se aplicam ao HealthHub (que usa Groq).

## 3. Dados que faltam para um custo real
| Dado | Quem fornece | Observação |
|---|---|---|
| Volume de atendimentos por dia (e dias por mês) | autor/instituição | hoje só há dados de demonstração |
| Perguntas de IA por atendimento | autor/medição em piloto | o app não registra |
| Tamanho típico do contexto (tokens) | medição local com tokenizador ou chamadas autorizadas | depende dos campos preenchidos |
| Duração média de áudio por atendimento | medição em piloto | o backend não registra |
| Plano da conta Groq (gratuito ou pago, limites) | autor | nome do plano |
| Preço por token (entrada/saída) do `openai/gpt-oss-120b` e preço do `whisper-large-v3-turbo` | **página oficial de preços da Groq** — URL e data de consulta a registrar pelo autor | nenhum preço foi citado aqui, de propósito |
| Hospedagem do frontend e do backend | autor | hoje só existe ambiente local comprovado |
| Banco PostgreSQL (hospedado ou próprio), backups | autor | idem |
| Equipamentos (tablets/computadores) e rede | instituição | |
| Licenças (Manchester/GBCR, outras) | autor/orientador | fora do escopo técnico |

## 4. Fórmulas (variáveis a preencher; sem valores)
Notação: preços em moeda por **1 milhão de tokens** (P_in, P_out) e por **unidade de tempo de áudio** (P_aud); tokens em unidades.

- Tokens de entrada de uma pergunta: `T_in = S + C + H + Q`
  - S = prompt fixo; C = dados do paciente; H = histórico (até 4 mensagens no frontend); Q = pergunta.
- Custo de uma pergunta: `custo_pergunta = (T_in × P_in + T_out × P_out) / 1.000.000`, com `T_out ≤ 1024` (`max_tokens`).
- Custo de áudio de um atendimento: `custo_audio = D_total_em_unidade_de_P_aud × P_aud`.
- Custo de IA por atendimento: `custo_atend = N_perguntas × custo_pergunta + custo_audio`.
- Custo de IA por mês: `custo_mes_IA = N_atend_dia × dias_mes × custo_atend`.
- Custo total mensal: `custo_mes = custo_mes_IA + hospedagem + banco + (equipamentos e licenças amortizados)`.
- Cota: se a conta tiver limite de uso, comparar `N_atend_dia × N_perguntas` com o limite do plano antes de falar em custo.

## 5. Dúvidas para o autor
1. Qual é o plano da conta Groq e a data da consulta de preços (URL oficial)?
2. Há estimativa de atendimentos por dia no cenário-alvo do TCC?
3. O limite de 10 KB do corpo JSON é intencional para o chat? (Pode recusar contextos longos; só afeta o custo indiretamente.)
