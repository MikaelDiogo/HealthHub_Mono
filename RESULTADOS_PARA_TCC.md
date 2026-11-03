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

**Ambiente da medição:** AMD Ryzen 7 170 (8 núcleos / 16 threads), 15,3 GB de RAM, Windows 11 Pro; Node 24.20.0; PostgreSQL 16.15 em contêiner Docker (porta 5435, banco novo `healthhub_test_perf`); API em modo desenvolvimento (`NODE_ENV=development`, `node dist/main`, provedor de IA simulado); cliente de medição **na mesma máquina** (sem rede). Base: commit `429e75e` + endpoint `/health` (esta tarefa). Dados fictícios. Nenhum outro processo pesado de propósito, mas o contêiner do banco de desenvolvimento e outros contêineres do usuário estavam ligados. Medição por script próprio (`fetch` do Node, 10 requisições de aquecimento descartadas), não por `autocannon`/`k6` (não instalados; evitei dependência nova).
**Comandos exatos** (em `evidencias_tcc/rodada_final/`, com `source /tmp/testenv_perf.sh`): `node desempenho.mjs fila`, `node desempenho.mjs escrita`, `node desempenho.mjs disp` (CSVs: `desempenho.csv`, `disponibilidade.csv`; logs `t5_*.log`).

**Endpoint de saúde (novo):** `GET /health`, público, sem dados: `200 {"status":"ok","database":"up"}` ou `503 {"status":"error","database":"down"}` (3 testes unitários; documentado no Swagger e no Readme do backend). Implementado com `DataSource.query('SELECT 1')`, sem a dependência `@nestjs/terminus`.

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

### Chat de IA e transcrição de áudio — NÃO medidos
Exigiriam a chave real da Groq, que não foi autorizada. Com o provedor simulado a latência não representa a do modelo. Fica pendente de você.

### SUGESTÕES de meta (marcadas como sugestão; **você decide a meta final**)
- **Desempenho:** "a listagem da esteira responde em até 100 ms no p95 com até 500 pacientes na fila e 10 usuários simultâneos" (medido: 67,5 ms); "as métricas do painel respondem em até 500 ms no p95 nas mesmas condições" (medido: 389 ms, com máx de 861 ms); "admissão e classificação de cor em até 100 ms no p95" (medido: 37 ms e 31 ms).
- **Disponibilidade:** "a API volta a responder em até 15 s após um reinício (medido: máx 6,5 s) e `GET /health` serve de verificação". Uma meta em percentual (por exemplo 99%) só faz sentido com monitoramento em operação real.

### Limites e cuidados na leitura dos números
- Ambiente de desenvolvimento, tudo na mesma máquina, sem rede: em hospedagem real a latência de rede se soma.
- O p50 sequencial ≈ 15 ms aparece igual em quase todas as linhas, enquanto o mínimo chega a 2,5 ms: parece um piso do cliente/sistema operacional (temporizador do Windows), não custo do endpoint. Por isso olho mais p95/p99 e o modo concorrente.
- As filas de teste foram criadas por SQL (pacientes, fila e visitas), **sem** sinais vitais nem eventos; o custo real com sinais e eventos pode ser um pouco maior.
- `GET /metricas` é o ponto que mais cresce com a fila (31 req/s com 500 entradas e 10 simultâneos).
- Um único cliente de medição, uma máquina: não é teste de carga de produção.

---

## Tarefa 9 — Dimensionamento de recursos (para o custo de hospedagem; preços não pesquisados)

**Medições durante os testes da Tarefa 5** (amostras a cada ~2 a 3 s; `recursos_*.csv`; resolução baixa: 8 amostras em repouso, 11 sob carga de leitura, 4 sob escrita):

| Componente | Em repouso | Sob a carga de leitura (pico = p95 das amostras) | Sob a carga de escrita (pico) |
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

**Recomendação de tamanho mínimo (estimativa a partir dos números acima, não validada por teste de carga em hospedagem):** uma máquina com **2 vCPU, 2 GB de RAM e 10 GB de disco** comportaria este uso com folga: a API pediu ≈ 350 MiB e o banco ≈ 75 MiB no pico medido (soma ≈ 0,4 GB, ou seja, cerca de 5 vezes de folga em 2 GB), e 10 GB cobririam a imagem do banco, o sistema operacional e algumas centenas de milhares de atendimentos. A CPU é o recurso mais sensível: o `GET /metricas` com fila grande ocupou perto de 1 núcleo da API. Valores finais dependem do perfil de uso real (número de usuários simultâneos), que não foi medido.


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

### Chat de IA e transcrição de áudio — NÃO medidos
Exigiriam a chave real da Groq, que não foi autorizada. Com o provedor simulado a latência não representa a do modelo. Fica pendente de você.

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
