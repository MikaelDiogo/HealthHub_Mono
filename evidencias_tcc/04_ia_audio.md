# 04 — IA e áudio com provedor simulado (T4)

> **Todas as respostas abaixo são SIMULADAS. Não vieram do modelo real.** Nenhuma chamada foi feita à Groq: o transporte HTTP do axios foi substituído por um *mock* (`mock/mock-groq.cjs`, carregado com `node -r`, sem alterar o código do projeto), que bloqueia qualquer URL fora de `api.groq.com`. A chave usada foi um texto sem valor (`CHAVE-SIMULADA-NAO-REAL`). Backend real, banco de teste isolado (porta 5435), paciente fictício. Hipóteses e CID **não** foram avaliados clinicamente.

Coleta em 29/10/2026. Arquivos: `mock/mock-groq.cjs`, `mock/casos_ia_audio.mjs`, `logs/casos_ia_audio_com_chave.json`, `logs/casos_ia_audio_sem_chave.json`, `logs/mock_requests.jsonl` (o que "saiu" para o provedor simulado), `logs/backend_mock_*_filtrado.log`.

## 1. Afirmações do TCC: confirmadas ou corrigidas
| Afirmação do TCC | Situação | Evidência (arquivo:linha) |
|---|---|---|
| Provedor Groq, modelo `openai/gpt-oss-120b`, `max_tokens` 1024, timeout 30 s | **Confirmado** | `ai/infrastructure/groq-chat.provider.ts:6-8,49,55`. Sem temperatura (`:49`). Mock registrou `modelo`, `max_tokens=1024`, `timeout=30000` |
| Contexto enviado: nome, alergias, medicamentos, anamnese e últimos sinais (temperatura, SpO₂, PA, FC) | **Confirmado** | `:10-18` (prompt) e `clinical-chat.service.ts:4-15` (campos permitidos) |
| Até 4 mensagens anteriores | **Corrigido:** o limite de 4 está no **frontend** (`Monitoring/index.tsx:108`, `messages.slice(-4)`). O **backend não limita**: aceitou 12 mensagens de histórico (caso I01-c) | `groq-chat.provider.ts:40-43`. O teto real é o corpo JSON de **10 kb** (`main.ts:27-28`), que devolve 413 |
| Sem anonimização | **Confirmado**: o nome entra literalmente no prompt (`:14`); o mock recebeu "TESTE A — Silva" nas 7 chamadas de chat | `logs/mock_requests.jsonl` |
| CPF, RG, telefone e endereço **não** são enviados | **Confirmado por teste:** mandei esses 4 campos no contexto (I01-b); **0 ocorrências** no que o mock recebeu. O backend só lê os campos do template (`:14-18`) | `logs/mock_requests.jsonl` |
| Prompt pede hipóteses | **Parcialmente**: a palavra "hipóteses" **não aparece** no prompt. Ele manda "nunca recuse uma questão clínica" e "ofereça sua melhor análise" (`:24`) | `groq-chat.provider.ts:11-27` |
| Prompt pede "CID provável" | **Confirmado**: regra 6 (`:26`) — "forneça referências a diretrizes de prática e sugira o CID provável". **A versão da CID não é informada** (nem CID-10 nem CID-11) | `:26` |
| O contexto do paciente vem do navegador, não do banco | **Confirmado**: o controller repassa `body.patientContext` e ignora o `:id` da URL | `ai.controller.ts:30-34` |
| Transcrição: `whisper-large-v3-turbo`, português, áudio em memória, 25 MB, só `audio/*` | **Confirmado** | `audio-transcription.service.ts:19-33`; `ai.controller.ts:36-49` |

## 2. O que "sai" para o provedor (medido no mock)
| Chamada | Mensagens | Caracteres (total) | Bytes do corpo |
|---|---|---|---|
| Chat sem histórico (I01-b) | 2 (sistema + usuário) | 1.059 | 1.249 |
| Chat com 4 mensagens de histórico (I01-a) | 6 | 1.221 | 1.544 |
| Chat com 12 mensagens de histórico (I01-c) | 14 | 1.476 | 2.067 |
| Áudio de 2 KB (I02-a) | — | — | 2.610 (multipart) |

O prompt de sistema tem **1.056 caracteres** com este contexto fictício curto; cresce com alergias, medicamentos e anamnese reais. **Estes bytes não são tokens**: o aplicativo **não registra** os tokens que a Groq devolve, então tokens por pergunta **não foram medidos** (ver `07_custos.md`).

## 3. Casos executados
Legenda de IDs: **I01** = chat com resposta simulada; **I02** = áudio válido; **I03** = áudio inválido/ausente; **extra** = casos além dos pedidos. Os IDs do roteiro de 28/10 são outros (lá o I03 é "sem chave"); aqui usei a numeração do seu pedido.

| ID | Caso | HTTP | Resposta do sistema |
|---|---|---|---|
| I01-a | Chat válido (contexto + 4 mensagens) | **201** | `{"reply":"[RESPOSTA SIMULADA…]","source":"groq"}` |
| I01-b | Contexto com CPF/RG/telefone/endereço extras | 201 | idem; **campos extras não foram repassados** |
| I01-c | Histórico com 12 mensagens | 201 | idem; **12 mensagens repassadas** (backend não limita) |
| I01-d | Provedor devolve 429 (simulado) | **500** | `{"error":"Assistente clínico indisponível.","detail":{…corpo do erro do provedor…}}` |
| I01-e | Provedor devolve 500 (simulado) | **500** | idem, com `detail` do provedor |
| I01-f | Timeout (simulado) | **500** | `{"error":"Assistente clínico indisponível.","detail":"timeout of 30000ms exceeded"}` |
| I01-g | Provedor sem escolhas | 201 | `{"reply":"","source":"groq"}` — resposta vazia com sucesso; a tela trata em `aiResponse.ts` (testado) |
| I01-h | Corpo > 10 kb | **413** | `{"statusCode":413,"message":"request entity too large"}` |
| I01-i | Sem token | 401 | `{"message":"Token não fornecido"}` |
| I01-j | Perfil recepcionista | 403 | `{"message":"Acesso negado para este perfil"}` |
| I01-k | `patientContext: null` | **500** | `{"statusCode":500,"message":"Internal server error"}` — erro não tratado: `ctx.nome` com `ctx = null` (`groq-chat.provider.ts:14`; o valor padrão `= {}` em `:10` só vale para `undefined`) |
| I01-l | Sem o campo `message` | 201 | **aceito**: não há validação (`ai.controller.ts:17-21` é só uma interface, sem DTO). O mock respondeu normalmente; **o provedor real provavelmente recusaria** (não medido) |
| I01-m | JSON inválido | 400 | mensagem do parser |
| **I02-a** | **Áudio válido** (audio/webm, 2 KB) | **201** | `{"transcription":"[TRANSCRIÇÃO SIMULADA…]"}`; o mock recebeu `whisper-large-v3-turbo`, `language=pt`, `response_format=json` |
| **I03-a** | **Áudio inválido** (text/plain) | **400** | `{"error":"Apenas arquivos de áudio são aceitos."}` (`ai.controller.ts:43-47`) |
| **I03-b** | **Áudio ausente** | **400** | `{"error":"Nenhum arquivo de áudio enviado."}` (`:52-54`) |
| I03-c | Áudio de 26 MB | 413 | `{"message":"File too large",…}` (limite de 25 MB, `:41`) |
| I03-d | Áudio de 0 byte (`audio/webm`) | **201** | **aceito e enviado ao provedor**; não há verificação de tamanho mínimo |
| I03-e | Provedor recusa o áudio (simulado) | 500 | `{"error":"Falha ao transcrever o áudio."}` (`audio-transcription.service.ts:36-39`); **sem `detail`** |
| I03-f | Perfil recepcionista | 403 | `{"message":"Acesso negado para este perfil"}` |
| extra | **Chat sem `GROQ_API_KEY`** | **503** | `{"error":"GROQ_API_KEY não configurada no .env."}` (`groq-chat.provider.ts:33-36`); **0 chamadas** ao provedor |
| extra | **Áudio sem `GROQ_API_KEY`** | **503** | `{"error":"Transcrição não configurada. Adicione GROQ_API_KEY no arquivo .env."}` (`audio-transcription.service.ts:10-15`) |

Os códigos 201 em operações de consulta (chat e transcrição) são o padrão do Nest para `POST`; não indicam criação de nada.

## 4. Achados sobre privacidade e robustez (para o TCC)
1. **Vazamento de detalhe do provedor ao navegador:** nos erros 429/500, o corpo devolvido pela Groq vai dentro de `detail` na resposta ao cliente (`groq-chat.provider.ts:63-65`) e o erro é impresso no log do servidor (`:64`). Comparado ao áudio (que não devolve `detail`), é inconsistente.
2. **Mensagem de erro cita `.env`** ao usuário final (503): expõe a forma de configuração.
3. **`patientContext: null` derruba a rota com 500** genérico (I01-k); `message` ausente não é validada (I01-l).
4. **Áudio vazio** passa (I03-d) e consumiria uma chamada paga em produção.
5. **Nenhuma anonimização**: o nome completo e a anamnese seguem em texto claro para a Groq (confirmado).
6. **Nenhum registro persistido da interação** (nem pergunta, nem resposta, nem quem perguntou): a auditoria da IA não existe (ver `06_modelo.md`).

## 5. O que este teste não prova
- Que a **Groq real** responda como o mock, nem o formato exato de seus erros (429, 5xx), nem a latência, nem o consumo de tokens.
- A **qualidade clínica** das respostas, das hipóteses ou do CID: exige profissional de saúde.
- Que o limite de 25 MB ou o `timeout` de 30 s funcionem contra a rede real (o timeout foi **simulado** pelo mock).
- Comportamento do **microfone no navegador** (o teste enviou bytes zerados com tipo `audio/webm`, não áudio real).

## 6. Como repetir
Pré-requisitos: banco de teste isolado (migrations e seed), `npm run build` do backend, variáveis `SEED_*`. Em `HealthHub-BackEnd`: `node -r ../evidencias_tcc/mock/mock-groq.cjs dist/main` (com `GROQ_API_KEY=CHAVE-SIMULADA-NAO-REAL`; para o modo "sem chave", sem a variável) e depois `MODO=com_chave SAIDA=saida.json node ../evidencias_tcc/mock/casos_ia_audio.mjs`.
