# Resultados para o TCC — rodada final (preenchido por tarefa, só com o que foi executado)

Ambiente das medições: Windows 11 Pro, Node 24.20.0, PostgreSQL 16.15 (contêiner `healthhub-test-db`, porta 5435, banco isolado), dados fictícios, IA só com provedor simulado. Branch `evolucao-estrutura`. Commit base: `d34768f`.

---

## Tarefa 1 — Concorrência na senha e na admissão

**Como a senha era gerada.** Pelo **cliente**: o frontend calculava "maior `PR-NNN` na fila + 1" (`proximaSenha`, `metricas.ts`) e enviava `senha` no `POST /fila`; o backend só gravava o valor recebido (`create-fila.service.ts`). A checagem "paciente já na fila" era um `SELECT` seguido de `INSERT` sem trava nem índice único, e a visita era aberta em outra conexão, fora de transação.

**O que mudou** (commit desta tarefa):
- `TypeormFilaRepository.admitirAtomico`: uma transação com `pg_advisory_xact_lock`, recusa de paciente já presente, **senha gerada no servidor** (maior `PR-NNN` + 1 dentro do bloqueio), `INSERT` da fila, visita (reaproveita a ativa) e reativação do paciente.
- Migration nova `1783400000000-UniqueFilaPorPaciente` (índice único `UQ_fila_pacientes_paciente`; aplicada, revertida e reaplicada sem erro — `evidencias_tcc/rodada_final/t1_migration.log`). Como as linhas da fila são apagadas na alta/saída, o índice único simples equivale ao parcial pedido.
- Violação do índice (`23505`) e paciente já na fila → **HTTP 409** (antes 400). Swagger e `DOCUMENTO_ENGENHARIA_SOFTWARE.md` atualizados (DEB-03 marcado como resolvido).
- A `senha` enviada pelo cliente passou a ser **ignorada** (campo opcional, mantido por compatibilidade). Efeito colateral: o frontend ainda calcula e envia a senha, mas o valor exibido é o devolvido pelo servidor.

**Resultado** (script `evidencias_tcc/rodada_final/concorrencia.mjs`, HTTP real contra a API local; logs `t1_antes.log` e `t1_depois.log`):

| Situação | Antes (5 repetições) | Depois (20 repetições) |
|---|---|---|
| 2 admissões simultâneas, pacientes diferentes, mesma senha calculada pelo cliente | **5 de 5** repetições com senha duplicada (`PR-001`,`PR-001`) | **0 de 20** com senha duplicada |
| 8 admissões simultâneas do mesmo paciente | **5 de 5** repetições com entradas duplicadas (de 2 a 8 entradas) | **0 de 20**; sempre 1×201 e 7×409 |
| Respostas 5xx | 0 | 0 |

Observação honesta: a primeira versão da correção falhou (500 em 100% das chamadas, depois senha repetida) por um erro meu na expressão regular da query SQL; foi corrigido e só o resultado final acima conta. Testes: backend 117 (115 + 2 novos: senha do cliente ignorada e 409 sem evento), frontend 20, todos verdes; build sem erro.
Limite: o teste de concorrência é um script HTTP (não roda no `npm test`, que não usa banco).

---

## Tarefa 2 — Nome do paciente fora do contexto enviado à IA

**O que encontrei.** O frontend (`Monitoring/index.tsx`) enviava `patientContext.nome` e o prompt do provedor (`groq-chat.provider.ts`) imprimia `**Nome:** ${ctx.nome}`. Nenhuma regra do prompt usava o nome. O backend não filtrava nada: repassava o contexto recebido.

**Campos enviados à Groq (contexto do paciente):**

| | Antes | Depois |
|---|---|---|
| Nome | enviado | **não enviado** |
| Alergias, medicamentos em uso, anamnese | enviados | enviados |
| Últimos sinais vitais (temperatura, SpO₂, PA, FC) | enviados | enviados |
| CPF, RG, telefone, endereço | não enviados (o prompt só lia os campos citados) | não enviados (agora garantido por filtro explícito) |
| Histórico de conversa | até 4 mensagens (limite aplicado no frontend) | idem |

**Mudanças.** Frontend deixou de enviar o nome. Backend: `contextoSemIdentificacao()` (em `clinical-chat.service.ts`) repassa ao provedor **só** os campos clínicos previstos e descarta o resto, mesmo que o cliente envie; o prompt perdeu a linha do nome (o título virou "PACIENTE (sem identificação)"). Textos do modal de termos e da página Política de Dados atualizados (nome, CPF, RG, telefone e endereço não são enviados; textos livres são enviados como escritos, com aviso para não digitar identificação). `DOCUMENTO_ENGENHARIA_SOFTWARE.md`: diagrama de IA, R-04 ("parcialmente mitigado") e lacunas de conformidade.

**Testes.** Novo `clinical-chat.service.spec.ts` (3 testes): o filtro descarta identificadores; e, com o axios simulado, o corpo enviado à Groq não contém nome/CPF/RG/telefone/endereço mesmo quando o cliente os manda. Backend 120 testes, frontend 20, build sem erro, `tsc` do frontend sem erros.
**Verificação ponta a ponta** (`t2_envio_ia.mjs`, API real + provedor simulado registrando o corpo em `t2_mock_requests.jsonl`): enviando nome/CPF/RG/telefone/endereço fictícios, **0 ocorrências** deles no que "saiu"; o campo clínico (alergia) aparece 1 vez.
Busca no código por `ctx.nome`/`patientContext.nome`: sem resultados.

**Limites.** O texto livre (anamnese, pergunta) continua sem filtro: um nome digitado nele seria enviado. A medição usou o provedor simulado, não a Groq real.

---

## Tarefa 3 — Testes dos RF sem cobertura (RF07, RF15, RF16, RF17, RF22) + desempate e salto de estado

Numeração dos RF = a do TCC (Seção 4.1.1). Contagem de testes: **backend 117 → 149 (+32)**; **frontend 20 → 25 (+5)**. Builds e `tsc` sem erro.

| RF / item | Arquivo | Testes (nomes resumidos) |
|---|---|---|
| RF07 histórico de sinais vitais | `HealthHub-BackEnd/src/rf-cobertura.http.spec.ts` | pede as 12 últimas e devolve na ordem do repositório; paciente inexistente → 400; perfis medico/enfermeiro 200 e recepcionista 403 (as duas rotas de histórico); sem login 401 |
| RF15 fechar visita | idem | 4 desfechos (Alta, Internacao, Transferencia, Saida Voluntaria) gravam desfecho e data de alta; padrão "Alta"; enfermeiro e recepcionista 403 sem gravar; desfecho inválido 400; sem visita aberta nada é gravado |
| RF16 assistente de IA | idem | médico/enfermeiro recebem a resposta e o contexto chega ao provedor; recepcionista 403; pergunta vazia 400; nome não chega ao provedor; **documenta que o backend não limita o histórico** |
| RF17 transcrição de áudio | idem | devolve o texto; arquivo chega só em memória (buffer, sem `path`); aceita 25 MiB−1 e recusa 25 MiB (413); não-áudio 400; recepcionista 403; sem arquivo 400 |
| RF22 termos de uso | `HealthHub-Project/src/utils/termosAceitos.spec.ts` | primeiro acesso = não aceito; aceitar grava a chave por versão e a data; continua aceito nos acessos seguintes; versão nova pede novo aceite; revogar remove |
| Desempate por chegada (mesma cor) | já existia: `list-fila.service.spec.ts` ("na mesma categoria, desempata por ordem de chegada") e cenário S2 | — |
| Salto de estado | `update-fila.transicoes.spec.ts` | 4 testes que documentam o comportamento atual (abaixo) |

**Achados reais (não ajustei testes para esconder):**
1. **Salto de estado é ACEITO hoje:** "Aguardando Triagem → Em Consulta (Médico)" e "→ Em Observação" passam, e retroceder também; só "Alta" pelo PUT é restrita ao médico. Não há regra de transição (como diz `fila-valores.ts`).
2. **RF16 — limite de 4 mensagens de histórico é só do frontend** (`messages.slice(-4)` em `Monitoring`); o backend repassa o que recebe (teste com 12 mensagens). O texto dos termos ("até 4 mensagens") vale para o app, não é garantia do servidor.
3. **RF17 — limite de 25 MB:** o arquivo de exatamente 25 MiB já é recusado (413); o efetivo é "abaixo de 25 MiB".
4. **RF15 — a rota `PATCH /patients/:id/visitas/fechar` não registra evento na esteira.** O evento `alta` existe no fluxo `PATCH /fila/:id/alta` (testado em `fila-eventos.spec.ts`). Não alterei o comportamento.

**Limites.** Os testes HTTP usam app Nest mínimo, o RolesGuard real e autenticação simulada (cabeçalho `x-role`); não passam pelo JWT real nem pelo banco. RF22: testei a lógica de gravação; a janela do modal não foi renderizada (o projeto não tem jsdom/Testing Library e não adicionei dependências). Para viabilizar o teste do RF22, movi as funções de aceite para `src/utils/termosAceitos.ts` (reexportadas pelo modal, sem mudar comportamento).

---

## Tarefa 4 — Rodada final dos 22 cenários sobre a versão publicada

**Commit testado:** `1948b8493ec3091f6bb9ce58ca932a67ca7713e0` (branch `evolucao-estrutura`, árvore sem alterações). Clone novo em `C:\Users\642mi\Documents\HealthHub_rodada_final_clone`, `npm ci` nos dois pacotes, **banco novo** (`healthhub_test_final`, mesmo contêiner Postgres 16.15, porta 5435) com as **10 migrations aplicadas do zero** e seed.
**Ambiente:** Windows 11 Pro, Node 24.20.0, npm 11.19.0, navegador Microsoft Edge 156.0.4314.58 (headless, DevTools Protocol), IA com provedor simulado. Detalhes: `evidencias_tcc/rodada_final/t4_ambiente_e_testes.log`.

**Testes e builds (clone, códigos de saída 0):** backend build OK, **149 testes** (17 arquivos); frontend build OK, **25 testes** (6 arquivos). Logs `t4_build_*.log`, `t4_vitest_*.log`.

**22 cenários (F01–F17 e C01–C05), execução 2** (`cenarios22/resultados.json`, gerado pelos scripts, sem edição manual):

| Caso | Perfil | Resultado |
|---|---|---|
| F01 | Todos | APROVADO |
| F02 | Recepcionista | APROVADO |
| F03 | Enfermeiro | APROVADO |
| F04 | Enfermeiro | APROVADO |
| F05 | Recepcionista | APROVADO |
| F06 | Recepcionista | APROVADO |
| F07 | Enfermeiro | APROVADO |
| F08 | Enfermeiro | APROVADO |
| F09 | Enfermeiro | APROVADO |
| F10 | Enfermeiro + Médico | APROVADO |
| F11 | Médico | APROVADO |
| F12 | Recepcionista | APROVADO |
| F13 | Cada perfil | APROVADO |
| F14 | Médico ou Enfermeiro | APROVADO |
| F15 | Dois perfis | APROVADO |
| F16 | Médico | APROVADO |
| F17 | Enfermeiro (mobile) | APROVADO |
| C01 | Recepção → Enfermagem → Médico (automação) | APROVADO |
| C02 | Recepção → Enfermagem → Médico (automação) | APROVADO |
| C03 | Recepção → Enfermagem → Médico (automação) | APROVADO |
| C04 | Recepção → Enfermagem → Médico (automação) | APROVADO |
| C05 | Recepção → Enfermagem → Médico (automação) | APROVADO |

**Resultado: 22 aprovados, 0 reprovados** — mas só na **execução 2**. A **execução 1** (mesmo commit, banco novo) teve **F15 e C01–C05 reprovados**, e está preservada em `cenarios22_execucao1/` com a explicação:
- **C01–C05:** scripts antigos liam `gravidade_manchester`, campo renomeado para `classificacao_risco` na migração Manchester → classificação de risco. Na execução 2 usei **cópias** dos scripts (`runner_atualizado/`) em que a **única** alteração é esse nome de campo (originais intactos em `evidencias_testes_2026-10-29/runner/`).
- **F15:** o script procura o contato "Enfermeiro Teste"; no banco novo o enfermeiro do seed tem o nome real do autor (vem de `HealthHub-BackEnd/src/database/seed.ts`). Na execução 2 renomeei o usuário **no banco de teste** (não no código) para "Enfermeiro Teste".
- As capturas da execução 1 foram **apagadas**, porque mostravam o nome real do autor. As da execução 2 não o contêm (busca nos arquivos de texto; nas imagens, garantido pelo nome do usuário no banco).
- F06 agora devolve **HTTP 409** (antes 400), contrato novo da Tarefa 1.

Os scripts dos cenários **não estão versionados no repositório** (ficam em `evidencias_testes_2026-10-29/runner`); os 11 scripts usados e a ordem foram inferidos pelos IDs e horários (f01, f02_f06, f03_f06, f07_f09, f10, f11_f12, f13, f14, f15, f16_f17, c01_c05); f04.mjs e f08_f09.mjs (versões antigas) não foram usados.

**Script de API do registro de eventos:** **14/14** OK (`t4_api_eventos_e_s1_s8.log`).
**Cenários S1–S8 de 30/10:** S1, S2, S3 OK; S4 com HTTP 403 e nenhuma cor gravada, mas com a **mesma divergência já registrada** (a recepção recebe a mensagem genérica do guard); S7 sem falhas; S8 repete o salto aceito (HTTP 200). Saídas em `s1_s8_rodada_final/`.

**Limites.** Automação solo, ambiente local; os tempos de C01–C05 seguem sendo tempo de automação, não tempo humano. O contêiner Postgres é o mesmo da rodada anterior (outro banco dentro dele). O seed do repositório ainda traz o nome real do autor (`seed.ts:22`): decisão pendente sua.

---

## Tarefa 5 — Desempenho e disponibilidade (RNF de desempenho e de disponibilidade)

**Ambiente da medição:** AMD Ryzen 7 170 (8 núcleos / 16 threads), 15,3 GB de RAM, Windows 11 Pro; Node 24.20.0; PostgreSQL 16.15 em contêiner Docker (porta 5435, banco novo `healthhub_test_perf`); API em modo desenvolvimento (`NODE_ENV=development`, `node dist/main`, provedor de IA simulado); cliente de medição **na mesma máquina** (sem rede). Base: commit `429e75e` + endpoint `/health` (esta tarefa). Dados fictícios. Não rodei outros processos pesados de propósito, mas outros contêineres do usuário estavam ligados. Medição por script próprio (`fetch` do Node, 10 requisições de aquecimento descartadas), não por `autocannon`/`k6` (não instalados; evitei dependência nova).
**Comandos exatos** (em `evidencias_tcc/rodada_final/`, com `source /tmp/testenv_perf.sh`): `node desempenho.mjs fila`, `node desempenho.mjs escrita`, `node desempenho.mjs disp` (CSVs: `desempenho.csv`, `disponibilidade.csv`; logs `t5_*.log`).

**Endpoint de saúde (novo):** `GET /health`, público, sem dados: `200 {"status":"ok","database":"up"}` ou `503 {"status":"error","database":"down"}` (3 testes unitários; documentado no Swagger e no Readme do backend). Implementado com `DataSource.query('SELECT 1')`, sem a dependência `@nestjs/terminus`. Backend: 152 testes.

### Leitura (milissegundos; 200 requisições por linha; "conc." = 10 simultâneas, 200 no total)

| Fila | Endpoint | Modo | mín | p50 | p95 | p99 | máx |
|---|---|---|---|---|---|---|---|
| 20 | GET /fila | seq. | 2,5 | 15,2 | 16,7 | 20,9 | 42,5 |
| 20 | GET /fila | conc. | 6,8 | 12,1 | 19,4 | 39,1 | 41,1 |
| 20 | GET /metricas | seq. | 4,5 | 15,0 | 18,6 | 25,2 | 31,8 |
| 20 | GET /metricas | conc. | 10,7 | 30,9 | 43,7 | 46,8 | 52,6 |
| 100 | GET /fila | seq. | 3,4 | 15,2 | 17,2 | 21,1 | 26,8 |
| 100 | GET /fila | conc. | 5,9 | 23,6 | 32,7 | 37,1 | 39,6 |
| 100 | GET /metricas | seq. | 10,0 | 15,8 | 28,3 | 31,6 | 43,9 |
| 100 | GET /metricas | conc. | 22,0 | 96,7 | 136,1 | 147,2 | 152,0 |
| 500 | GET /fila | seq. | 8,1 | 15,6 | 27,9 | 46,9 | 66,4 |
| 500 | GET /fila | conc. | 20,6 | 53,3 | 67,5 | 71,0 | 74,6 |
| 500 | GET /metricas | seq. | 28,3 | 45,1 | 59,0 | 66,9 | 67,9 |
| 500 | GET /metricas | conc. | 98,6 | 318,6 | 389,0 | 412,0 | 861,1 |

Vazão com 10 simultâneas: GET /fila 716, 406 e 183 req/s (20, 100, 500 entradas); GET /metricas 310, 98 e 31 req/s. Nenhuma resposta diferente de 200.

### Escrita (100 repetições sequenciais cada, ms)

| Operação | mín | p50 | p95 | p99 | máx |
|---|---|---|---|---|---|
| POST /fila (admissão, transacional com senha no servidor) | 16,6 | 29,8 | 37,1 | 44,7 | 45,1 |
| PUT /fila/:id (classificar a cor, registra evento) | 10,4 | 17,6 | 30,9 | 33,2 | 34,9 |

### Disponibilidade — tempo até `GET /health` voltar a 200 após reiniciar (5 repetições, s)

| O que foi reiniciado | Medidas | Mediana | Máx |
|---|---|---|---|
| Só o banco (`docker restart`) | 1,5 · 2,2 · 1,1 · 1,1 · 1,2 | 1,2 | 2,2 |
| Só a API (processo Node) | 6,5 · 5,6 · 5,0 · 5,1 · 5,6 | 5,6 | 6,5 |
| Banco e API | 6,4 · 5,6 · 6,2 · 5,8 · 5,6 | 5,8 | 6,4 |

A API **reconectou sozinha** depois do reinício do banco (nenhuma rodada ficou sem resposta). **Não medi disponibilidade como percentual de tempo no ar** (isso exigiria operação contínua); medi só o tempo de recuperação.

### Chat de IA e transcrição de áudio — medidos com o provedor REAL (Groq), 03/11/2026
Autorizado pelo autor. A chave ficou só no processo da API (carregada do `.env` do backend, ignorado pelo Git); os scripts não a leem nem a imprimem. Modelos (constantes do backend): chat `openai/gpt-oss-120b`, transcrição `whisper-large-v3-turbo`. Paciente 100% fictício; prompt real do aplicativo (contexto: alergias, medicamentos, anamnese e sinais vitais fictícios, sem nome); áudio: voz sintética do Windows ("Maria", pt-BR), 41,9 s, ditado fictício. Script `t5_ia_real.mjs`; dados `t5_ia_real_latencias.csv`; log `t5_ia_real.log`.

| Chamada | n | mín | p50 | p95 | p99 | máx |
|---|---|---|---|---|---|---|
| `POST /patients/:id/chat` (texto) | 30 | 2.545 | 2.795 | 5.723 | 6.137 | 6.137 ms |
| `POST /patients/:id/chat/audio` (áudio de 41,9 s) | 30 | 559 | 765 | 1.640 | 1.878 | 1.878 ms |

Todas as 60 chamadas devolveram HTTP 201 (espaçadas em 13 s no chat e 4 s no áudio).

**Achado importante (execução 1, preservada em `execucao1_com_429_*`):** com apenas 2 s de intervalo, **14 das 30 chamadas de chat e 3 das 30 de áudio falharam**. A Groq respondeu **429** (limite de **8.000 tokens por minuto** do modelo nesta conta, com cada chamada "pedindo" ~1.417 tokens, o que dá cerca de 5 chamadas de chat por minuto; no áudio, limite de requisições). O **backend converte esse 429 em HTTP 500** para o usuário, sem mensagem útil. Na prática, vários profissionais usando o assistente ao mesmo tempo podem receber erro. É limitação do plano/conta e do tratamento de erro; não alterei o código.

**Custo estimado (não medido no painel da Groq):** abaixo de US$ 0,05 para todas as chamadas desta rodada.

Limites: ambiente local, um cliente, conta e plano da Groq do autor; a latência de rede até a Groq varia.

### SUGESTÕES de meta (marcadas como sugestão; **você decide a meta final**)
- **Desempenho:** "a listagem da esteira responde em até 100 ms no p95 com até 500 pacientes na fila e 10 usuários simultâneos" (medido: 67,5 ms); "as métricas do painel respondem em até 500 ms no p95 nas mesmas condições" (medido: 389 ms, com máximo de 861 ms); "admissão e classificação de cor em até 100 ms no p95" (medido: 37 ms e 31 ms).
- **Disponibilidade:** "a API volta a responder em até 15 s após um reinício (medido: máximo de 6,5 s) e `GET /health` serve de verificação". Uma meta em percentual (por exemplo 99%) só faz sentido com monitoramento em operação real.

### Limites e cuidados na leitura dos números
- Ambiente de desenvolvimento, tudo na mesma máquina, sem rede: em hospedagem real a latência de rede se soma.
- O p50 sequencial ≈ 15 ms aparece igual em quase todas as linhas, enquanto o mínimo chega a 2,5 ms: parece um piso do cliente/sistema operacional (temporizador do Windows), não custo do endpoint. Por isso olho mais p95/p99 e o modo concorrente.
- As filas de teste foram criadas por SQL (pacientes, fila e visitas), **sem** sinais vitais nem eventos; o custo real com sinais e eventos pode ser um pouco maior.
- `GET /metricas` é o ponto que mais cresce com a fila (31 req/s com 500 entradas e 10 simultâneos).
- Um único cliente de medição, uma máquina: não é teste de carga de produção.

---

## Tarefa 9 — Dimensionamento de recursos (para o custo de hospedagem; preços não pesquisados)

**Medições durante os testes da Tarefa 5** (amostras a cada ~2 a 3 s; `recursos_*.csv`; resolução baixa: 8 amostras em repouso, 11 sob carga de leitura, 4 sob escrita):

| Componente | Em repouso | Sob a carga de leitura (pico) | Sob a carga de escrita (pico) |
|---|---|---|---|
| PostgreSQL (`docker stats`) | CPU ≈ 0 %, memória ≈ 54 MiB | CPU 23 % de 1 núcleo, memória 74 MiB | CPU 15 %, memória 57 MiB |
| API Node (processo, modo desenvolvimento) | memória ≈ 95 MiB | memória 343 MiB; ≈ 20 s de CPU em 29 s (cerca de 70 % de 1 núcleo) | memória 345 MiB |

**Tamanho do banco** (`pg_database_size`): 8,5 MB com o seed e sem dados.
**Crescimento por 1.000 atendimentos** (gerado por SQL com dados fictícios, `t9_crescimento_banco.txt`; **as quantidades por atendimento são premissa minha, não medida de uso real**: 1 paciente, 1 visita, 6 eventos, 3 leituras de sinais vitais, 5 mensagens de chat de ~80 caracteres):

| Tabela | Crescimento |
|---|---|
| fila_eventos | 1.384 KiB |
| messages | 1.344 KiB |
| sinais_vitais | 464 KiB |
| pacientes | 376 KiB |
| visitas | 192 KiB |
| **Total** | **≈ 3,7 MiB por 1.000 atendimentos** (≈ 3,7 GB por milhão) |

**Disco do Docker** (`docker system df`, máquina inteira, não só o HealthHub): imagens 3,46 GB, contêineres 222 MB, volumes locais 710 MB. A imagem `postgres:16-alpine` ocupa 420 MB. Não medi a imagem da API (ela roda como processo Node, fora de contêiner).

**Recomendação de tamanho mínimo (estimativa a partir dos números acima, não validada por teste de carga em hospedagem):** uma máquina com **2 vCPU, 2 GB de RAM e 10 GB de disco** comportaria este uso com folga: a API pediu ≈ 350 MiB e o banco ≈ 75 MiB no pico medido (soma ≈ 0,4 GB, cerca de 5 vezes de folga em 2 GB), e 10 GB cobririam a imagem do banco, o sistema operacional e algumas centenas de milhares de atendimentos. A CPU é o recurso mais sensível: o `GET /metricas` com fila grande ocupou perto de 1 núcleo da API. Os valores finais dependem do perfil de uso real (número de usuários simultâneos), que não foi medido.


---

## Tarefa 6 — Capturas: termos de uso, chat de IA com CID e transcrição de áudio

**As três partes foram feitas** ((b) e (c) com o provedor real da Groq, autorizado pelo autor depois da primeira entrega).

### (a) Termos de uso — feito
- **Captura:** modal aberto no primeiro acesso, conta fictícia (médico do seed), viewport 1280 × 800, tema claro; o texto longo foi rolado e capturado em 8 partes: `evidencias_tcc/rodada_final/t6_capturas/termos-uso.png` (início) até `termos-uso-8.png`. **A seção do assistente de IA está em `termos-uso-5.png`** (cópia: `termos-uso-secao-ia.png`). Nenhum dado real na tela (o nome no canto é o médico fictício do seed).
- **Busca `Ollama|Qwen|Llama`:** **zero ocorrências** no código-fonte do backend e do frontend, no `index.html`, nos READMEs e no `DOCUMENTO_ENGENHARIA_SOFTWARE.md`, e **zero** no texto efetivamente exibido no modal (`t6_termos_verificacao.txt`).
- **Texto cita:** Groq, `gpt-oss-120b` e Whisper (modal, página Política de Dados e PDF da política).
- **Achado corrigido nesta tarefa:** o **PDF** da política (`gerarPDFPolitica.ts`) ainda dizia "o nome completo é enviado" (a Tarefa 2 pedia revisar o PDF e eu só tinha ajustado o modal e a página). Corrigido para o mesmo texto do modal. O PDF não foi regenerado/capturado.
- **Legenda sugerida (parte 5):** "Figura X — Seção do Termo de Uso sobre o assistente clínico: contexto enviado à Groq (alergias, medicamentos, anamnese e sinais vitais; sem nome, CPF, RG, telefone e endereço), modelo `openai/gpt-oss-120b` e transcrição por Whisper."
- Registro: 03/11/2026, commit base `437e700` + correção do PDF; provedor de IA não é usado nesta captura.

### (b) Chat de IA com sugestão de CID, provedor real — FEITO
- **Captura:** `evidencias_tcc/rodada_final/t6_capturas_ia/chat-ia-cid.png` (viewport 1280 × 800, tema claro). Paciente fictício com sinais vitais; pergunta: "Quais os diagnósticos diferenciais mais prováveis, os sinais de alerta a pesquisar e a conduta inicial? Sugira o CID provável." A resposta real traz hipóteses e **CID** (na captura: lombalgia mecânica aguda, M54.5).
- **Modelo:** `openai/gpt-oss-120b` na Groq (constante do backend; a API não devolve o nome do modelo na resposta). **Tempo de resposta na captura:** em torno de 2 a 3 s (a medição das 30 chamadas está na Tarefa 5). **Data:** 03/11/2026. Resposta de exemplo completa (1ª chamada da medição): `t5_ia_real_exemplo_resposta_chat.md`.
- **Legenda sugerida:** "Figura X — Assistente de caso clínico respondendo a um paciente fictício com diagnósticos diferenciais, sinais de alerta, conduta inicial e sugestão de CID (modelo openai/gpt-oss-120b, via Groq)."
- **Achado visual:** a tabela Markdown da resposta aparece na tela como barras verticais (`|`) em texto corrido: a interface **não renderiza tabelas Markdown**. A captura mostra isso; se o TCC usar a figura, convém comentar ou corrigir a renderização antes.
- A captura mostra o começo da resposta; o texto é longo e o painel rola.

### (c) Transcrição de áudio — FEITO
- **Capturas:** `t6_capturas_ia/transcricao-audio-1-gravando.png` (gravando), `transcricao-audio-2-transcrevendo.png` (transcrevendo) e `transcricao-audio.png` (texto transcrito preenchendo o campo da pergunta). Mesmo viewport.
- **Como foi gravado:** o navegador automatizado usou um **microfone falso** que reproduz um WAV de voz sintética do Windows (pt-BR, ditado fictício de 41,9 s). Não é a voz de uma pessoa nem um microfone real.
- **Modelo:** `whisper-large-v3-turbo` (Groq). **Resultado:** texto transcrito de 486 caracteres, quase idêntico ao ditado; **houve um erro**: "alteração na urina" saiu como "alterar calnaurina" (o resto, correto). Texto completo: `t5_ia_real_exemplo_transcricao.txt`.
- **Legenda sugerida:** "Figura X — Gravação de um ditado (voz sintética) e o texto transcrito preenchendo a pergunta ao assistente (Whisper large-v3-turbo, via Groq)."
- Verificação automática e log: `t6_capturas_ia_verificacao.txt`. Nenhuma chave de API aparece nas imagens.

---

## Tarefa 7 — Benchmark: harness e CSVs por chamada no repositório; pensamento estendido

**Onde estava o harness:** `eval/` na raiz do repositório (pasta **não versionada**; o `.env` dela é ignorado pelo Git e **não foi lido nem copiado**). Não precisei pedir caminho.

**O que foi publicado:** pasta `benchmark/` com o código do harness (`runner.ts`, `relatorio.ts`, `prompt.ts`, `adapters/`, `validate.ts`, `types.ts`, `package.json` e lock, `.env.example` sem valores), as **48 vinhetas** (`harness/vinhetas.csv`), os **CSVs por chamada** (um por modelo, **144 chamadas cada**: 48 vinhetas × 3 repetições) e o `resumo.md`, mais um `README.md` com instruções de reprodução (versões, comandos, parâmetros). Varredura por chaves, tokens, caminhos pessoais e o nome do autor: **nada encontrado**.

**Pensamento estendido (resposta objetiva, com a evidência no `benchmark/README.md`):**
- **Claude Sonnet 5, Sonnet 5.5 e Opus 5.5:** o harness **não configura pensamento nem esforço** (nenhuma flag no CLI em `adapters/claudeCode.ts`; a variável `CLAUDE_EFFORT` é removida do ambiente do subprocesso). O padrão do CLI para cada modelo **não é determinável** pelo harness. Indício indireto (inferência): `tokens_out` médio de 64, 73 e 97, compatível com só a resposta visível, sem pensamento estendido relevante.
- **Groq `gpt-oss-120b`:** o pedido **não envia `reasoning_effort`** (só `temperature: 0` e `max_tokens: 512`); vale o padrão do provedor, não registrado. `tokens_out` médio 230 para uma resposta de ~65 tokens indica tokens de raciocínio (inferência).
- **Não foi possível determinar** se o CLI aplicou pensamento por padrão nem o nível padrão do Groq. Para fechar, só rodando de novo com o parâmetro explícito, o que consome cota e **não foi feito**.

**Conferência da Tabela 2 (recalculada dos CSVs): nenhuma diferença.** Groq 132/144 e 978 ms; Sonnet 5 132/144 e 3.658 ms; Sonnet 5.5 138/144 e 1.811 ms; Opus 5.5 137/144 e 2.709 ms. Há ainda uma execução anterior do Sonnet 5 (`-run1`: 132/144, 3.590 ms), preservada e fora da Tabela 2.
**Cuidado:** o tempo dos modelos Claude é `duration_api_ms` do CLI, e o do Groq é medido pelo harness (grandezas parecidas, não idênticas).


---

## Tarefa 8 — Limiares de alerta de sinais vitais

**Não alterei nenhum valor e não escolhi nenhum valor clínico.** Levantamento completo em `evidencias_tcc/rodada_final/limiares_sinais_vitais.md` (commit `77d8e90`).

| Sinal | Crítico | Atenção | Onde no código | Fonte registrada? |
|---|---|---|---|---|
| SpO₂ | `< 92` | `< 95` | `vitalStatus.ts` (frontend); crítico também em `calcular-metricas.ts` (backend) | Não |
| Frequência cardíaca | `> 100` ou `< 60` | `> 90` | idem | Não |
| Temperatura | `> 38,5 °C` | `>= 37,8 °C` | idem | Não |
| Pressão arterial | — | — | texto livre (`varchar(20)`), **sem limiar e sem alerta** | — |

Faixas de recusa no servidor (não são alertas): FC 0–300 bpm (inteiro), SpO₂ 0–100 %, temperatura 25–45 °C, PA até 20 caracteres. Nenhuma tem fonte registrada.

**Achados:**
- **Nenhuma fonte clínica** aparece em comentários, testes ou documentos. O teste do frontend só diz "Limiares exigidos: …" sem dizer por quem; o do backend diz que os limites estão "sem fonte clínica documentada".
- **A referência do HC-UFTM citada no TCC não existe no repositório** (busca por `UFTM`): não sei que valores ela traz e não extrapolei.
- **Duplicação:** os limiares de crítico estão em dois lugares (frontend e backend) e o backend não tem o nível "atenção"; mudar um sem o outro faz a tela e a lista "atenção"/métricas divergirem.

**As duas opções estão em branches separadas, a partir de `77d8e90`; a branch principal (`evolucao-estrutura`) não recebeu código novo:**
- **Opção A — `limiares-opcao-a-pressao-estruturada`** (commit `6d102f4`): limiares centralizados em um arquivo por pacote (`fonte: null` em todos, valores idênticos aos atuais); campos `pressao_sistolica` e `pressao_diastolica` (migration reversível, testada com aplicar, reverter e reaplicar, `t8_opcao_a_migration.log`; entidade, DTO, serviço); **nenhum limiar de pressão definido** e **nenhum teto de validação** (só "inteiro, não negativo"). **Pendente:** os três formulários do frontend (cadastro, edição e triagem mobile) ainda não têm os campos novos. Testes: backend 157, frontend 25 (o spec existente de `vitalStatus` confirma que os alertas não mudaram).
- **Opção B — `limiares-opcao-b-chave-de-alertas`** (commit `5773fdb`): chave `ALERTAS_SINAIS_VITAIS=false` (backend) e `VITE_ALERTAS_SINAIS_VITAIS=false` (frontend) que desliga os alertas, mantendo o registro e a exibição dos sinais; padrão ligado (comportamento atual). Testes: backend 156, frontend 27.
- As duas opções não foram combinadas entre si nem mescladas.

**Atualização (03/11/2026): a fonte citada no TCC foi localizada.** É o POP.HC-UFTM-DENF.003, versão 6 (Rotina de Registro de Sinais Vitais e Controles, Ebserh), público no gov.br. Ele traz valores de referência (FC adulto 60–100; SpO₂ normal 95–100; temperatura com faixas de 36,0 a 40,1 ou mais; classificação de pressão) e a escala NEWS 2. A comparação com os limiares do sistema está na seção 5 de : os limites de FC (60 e 100) e de temperatura (37,8) coincidem; ** bpm como atenção e  como crítico não aparecem no POP**. É um POP de internação, não de triagem, e a decisão de adotar valores dele continua sendo sua.

**Pendente de você:** decidir, com o orientador ou um profissional, se adota os valores do POP/NEWS 2, os valores de pressão (se for a Opção A) e a escolha entre as opções.


---

## Tarefa 9 — ver acima (feita junto com a Tarefa 5)

---

## Tarefa 10 — Instrumentos do ensaio cronometrado papel × HealthHub (preparados; **o ensaio é seu e não foi executado**)

Pasta: `evidencias_tcc/rodada_final/ensaio_cronometrado/`. **Nenhum resultado, tempo ou número do ensaio foi preenchido ou estimado.**

| Arquivo | Função |
|---|---|
| `casos_fonte.csv` | Os 5 casos (`FICTÍCIO-01` a `-05`): categorias e chegadas do seu roteiro (amarela 08:00 e 08:05; laranja 08:10; verde 08:15; azul 08:20) e CPFs fictícios; **idade, sexo, motivo e sinais vitais artificiais estão em branco** |
| `gerar_instrumentos.mjs` | Gera, a partir do CSV acima, os cartões, a ficha de papel, a planilha de coleta e o roteiro |
| `cartoes_caso.html` | Um cartão imprimível por paciente (A4), com a categoria artificial e o aviso de que **não é classificação clínica nem gabarito** |
| `formulario_papel.html` | Ficha de papel com os mesmos campos do sistema (cadastro, sinais vitais, motivo, cor de risco) |
| `coleta_ensaio.csv` | Planilha com colunas caso, repetição, tentativa, método, ordem de execução, início, fim, tempo em segundos, campos obrigatórios completos, erros/omissões, falhas, ajuda e observações; 30 linhas válidas (5 casos × 3 repetições × 2 métodos) + 2 de familiarização (fora do cálculo), **todas com tempos em branco** |
| `roteiro_execucao.md` | Ordem **alternada** das modalidades por caso e repetição, regras de cronometragem, familiarização, preservação de todas as tentativas e as declarações obrigatórias (ensaio solo, viés de familiaridade) |
| `reiniciar_sistema_limpo.mjs` | Deixa o sistema limpo entre repetições (apaga fila e pacientes `FICTÍCIO-*` do banco de teste isolado; recusa rodar se o banco não parecer de teste) |
| `analisar_ensaio.mjs` | **Para depois da coleta:** média, mediana, mínimo, máximo, desvio-padrão, taxa de completude, erros, diferença e razão papel ÷ sistema, tabela e gráfico de barras (SVG). Avisa quando n é pequeno e não afirma significância estatística |

**O que ficou pendente de você:**
1. **Os dados clínicos dos casos** (idade, sexo, motivo, sinais vitais artificiais): o Apêndice A do TCC **não está no repositório** e eu não inventei valores. Preencha `casos_fonte.csv` e rode `node gerar_instrumentos.mjs` de novo para regenerar os cartões.
2. Executar o ensaio com cronômetro e preencher `coleta_ensaio.csv`; depois rodar `node analisar_ensaio.mjs`.
3. Com 3 repetições (ímpar) a alternância não fica perfeitamente balanceada por caso (cada caso começa 2 vezes por um método e 1 pelo outro); o roteiro sugere 4 repetições.
**Teste do código de análise:** rodei `analisar_ensaio.mjs` com um CSV **sintético, rotulado e descartado** (em pasta temporária, fora das evidências) só para ver se o cálculo funciona; esses números não existem em nenhum arquivo de resultado.

---

## Pendências que dependem de você

1. ~~Chave real da Groq~~ — **feito** (medições e capturas reais; ver tarefas 5 e 6). Resta decidir o que fazer com o limite de 8.000 tokens/min da Groq e com o 429 virando 500 no backend.
2. **Fonte clínica dos limiares de sinais vitais** (e o limiar de pressão, se escolher a Opção A) e a **escolha entre as Opções A e B** da Tarefa 8.
3. **Metas finais** de desempenho e disponibilidade (as da Tarefa 5 são só sugestões).
4. **Preço de hospedagem:** não pesquisado; os recursos medidos estão na Tarefa 9.
5. **Execução do ensaio cronometrado** e os dados clínicos dos 5 casos (Tarefa 10).
6. **Nome real do autor no seed** (`HealthHub-BackEnd/src/database/seed.ts`, usuário enfermeiro): decidir se troca no código. Enquanto isso, nos bancos de teste eu renomeio o usuário para não vazar o nome nas capturas.
7. **Decidir o que commitar ou ignorar** das pastas soltas (`coleta_tcc/`, `eval/`, `Print_healthhub/` etc.) e se faz **push** e merge: nada desta rodada foi enviado ao GitHub.
8. Itens de produto apontados nos testes: o salto de estado na esteira é aceito (Tarefa 3); o histórico da IA não é limitado no backend (Tarefa 3); a recepção recebe a mensagem genérica do guard no S4; a rota de fechar visita não registra evento.
