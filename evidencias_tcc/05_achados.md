# 05 — Achados do código (T5): contradições e lacunas

**Data:** 29/10/2026 · **Versão:** commit `ef1f7e9f26a8e19f475fb056b1839b4b1f75e172` + alterações não commitadas ("WT", ~100 arquivos) · **Método:** leitura do código atual e de `git show HEAD:…`; nada foi executado nem alterado. Evidência de comportamento só do que já existe: `C:\Users\642mi\Documents\HealthHub_Testes_Rodada2\resultados.json` e `RESUMO.md` (rodada de 29/10, na versão WT).

Legenda: **HEAD** = commit `ef1f7e9`; **WT** = árvore atual (inclui as correções de 29/10). Caminhos relativos a `HealthHub-BackEnd/src/` (BE) e `HealthHub-Project/src/` (FE).

## Quadro-resumo
| # | Item | Estado no código atual (WT) | Estava assim em HEAD? |
|---|---|---|---|
| 1 | Ordem da fila: sem classificação antes do Vermelho | **Corrigido na WT** (sem cor por último) | HEAD **não ordenava por gravidade** (só `created_at`) |
| 2 | /mobile ordena diferente | **Corrigido na WT** (5 níveis) | HEAD: só Vermelho/Amarelo/Verde; Laranja e Azul fora |
| 3 | Desempate entre mesma cor | **Existe** (`created_at` asc) | n/a (não havia ordenação) |
| 4 | Sinais vitais vazios contam como "registrados" | **Confirmado** (API aceita `{}`) | igual |
| 5 | `status` e `gravidade` aceitam texto livre | **Confirmado** | igual |
| 6 | Alta por `PUT` (enfermeiro) contorna "alta só do médico" | **Confirmado — achado novo** | igual (`PATCH …/alta` é novo na WT) |
| 7 | `patients/:id/visitas` e `/chat` abertas a qualquer autenticado | **Confirmado** | igual |
| 8 | `/metricas` e `GET /patients` expõem dado clínico à recepção | **Confirmado — achado novo** | `/metricas` é novo; `GET /patients` igual |
| 9 | `DELETE` remove da fila sem encerrar a visita | **Confirmado** | igual |
| 10 | Senha: sem unicidade no banco e sem controle de concorrência | **Confirmado** | HEAD: senha ainda gerada por contador local (reiniciava) |
| 11 | Termos/Política: Ollama/Qwen/Llama e "data de nascimento" | **Confirmado** | igual |
| 12 | Perfis: só recepcionista, enfermeiro, médico | **Confirmado** | igual |

---

## 1–3. Ordem da fila (backend, /mobile, desempate)
**Backend — `BE/modules/fila/application/list-fila.service.ts`**
- `:8-15` define `Vermelho=1 … Azul=5` e `SEM_CLASSIFICACAO=99`; `:17-24` ordena por rank e desempata por `created_at` crescente (`:22`). `:6-7` documenta "sem cor nunca fica à frente de um Vermelho (RF09)".
- **HEAD:** o arquivo só chamava `findAll()` (sem ordenação por gravidade). A versão intermediária da WT (28/10) colocava sem classificação **primeiro**; é a que o roteiro de 29/10 reprovou no F10. O texto do TCC que diz "não classificados antes de Vermelho" descreve esse estado intermediário, que **não existe mais** na WT.
- **Evidência:** teste unitário `BE/modules/fila/application/list-fila.service.spec.ts:20` (ordem das 5 cores), `:33` (desempate por chegada), `:44` (sem classificação por último). Execução F10 (rodada de 29/10, WT): ordem do backend `Vermelho → Laranja → Amarelo → Verde → Azul → sem cor` (`resultados.json`, caso F10, APROVADO).
- **Limite:** o desempate usa `created_at` do servidor, não a hora de chegada digitada (`chegada` é `varchar` livre, `fila-paciente.entity.ts:20-21`).

**/mobile — `FE/pages/MobileTriage/index.tsx:295-300`**
- Ordena com `{Vermelho:0, Laranja:1, Amarelo:2, Verde:3, Azul:4}` e sem cor = 5; `Array.sort` é estável, então o empate preserva a ordem recebida do backend (chegada).
- **HEAD:** `const order = { Vermelho: 0, Amarelo: 1, Verde: 2 }` — Laranja e Azul caíam no mesmo grupo dos não triados; esse é o defeito documentado em 28/10, **corrigido na WT**.
- A desktop (`FE/pages/Alerts/index.tsx`) não reordena: mostra por coluna na ordem do backend.

**Proposta (já aplicada na WT; falta só commitar):** commitar `list-fila.service.ts`, o spec e `MobileTriage`. Para evitar divergência futura, extrair a regra de ordenação para um único módulo usado pelos dois clientes (ou fazer o /mobile confiar na ordem do backend).

## 4. Sinais vitais vazios
- **Confirmado.** `BE/modules/sinais-vitais/presentation/dtos/create-sinais-vitais.dto.ts:5-34`: **todos** os campos são `@IsOptional()`. `BE/modules/sinais-vitais/application/create-sinais-vitais.service.ts:21-28` grava a linha mesmo com tudo `undefined`.
- A regra de bloqueio da classificação conta **linhas**, não conteúdo: `BE/modules/fila/application/update-fila.service.ts:38-41` (`sinais.length === 0` → recusa). Logo `POST /sinais/:id` com `{}` libera a classificação.
- A interface só protege parcialmente: o cadastro envia sinais apenas se houver temperatura **ou** FC (`FE/components/Buttons/index.tsx:158`, `FE/pages/MobileTriage/index.tsx:446`); uma medição só de SpO₂ ou PA é descartada nesses formulários. A edição usa `temSinais` com os quatro campos (`FE/components/Buttons/ModalEditPatient.tsx:112`).
- **Proposta:** no DTO ou no serviço, recusar `400` quando nenhum de FC, SpO₂, PA ou temperatura vier preenchido; e alinhar a condição do cadastro (`Buttons/index.tsx:158`) para os quatro campos. Exige um teste novo (não existe hoje).

## 5. Campos livres: `status` e `gravidade`
- **Confirmado.** `BE/modules/fila/presentation/dtos/update-fila.dto.ts:4-11`: `status` e `gravidade` são `@IsString() @MaxLength(50)`, sem `@IsIn`. A coluna é `varchar` (`BE/modules/fila/domain/fila-paciente.entity.ts:23-27`). `create-fila.dto.ts:24-26` também aceita qualquer `status` na admissão.
- **Não há validação de transição:** `update-fila.service.ts:45` apenas atribui `entrada.status = data.status`. Qualquer perfil autorizado no `PUT` (médico, enfermeiro) pode pular etapas ou gravar `gravidade: "Roxo"` (desde que seja enfermeiro e haja sinais).
- **Já tem whitelist:** só o desfecho e a gravidade de `CloseVisitaDto` (`BE/modules/visitas/presentation/dtos/close-visita.dto.ts:6,11`).
- **Proposta:** `@IsIn([...5 status...])` e `@IsIn([...5 cores...])` nos DTOs; mapa de transições permitidas em `update-fila.service.ts` (ex.: `Aguardando Triagem → Em Triagem → Aguardando Atendimento → Em Consulta → Em Observação`). A interface já só gera esses valores, então o risco de quebrar é baixo, mas o seed e o TCC precisam citar os mesmos nomes.

## 6. Alta por `PUT` contorna a regra "alta só do médico" (achado novo)
- `BE/modules/fila/presentation/fila.controller.ts:38-39`: `PUT /fila/:id` aceita `medico` e `enfermeiro`. `update-fila.service.ts:10,50-57`: se `status === 'Alta'`, fecha a visita e inativa o paciente — e **não** remove a entrada da fila (diferente de `PATCH /fila/:id/alta`, `discharge-fila.service.ts:30-32`, restrito a médico em `fila.controller.ts:53-54`).
- Consequência: o enfermeiro, que recebe 403 em `PATCH …/alta` (confirmado por API no F13), consegue o mesmo efeito clínico (visita encerrada, paciente inativo) via `PUT` com `status: "Alta"`, e a entrada fica na esteira com status "Alta". **O F13 de 29/10 não cobriu esse caminho.** A interface não oferece esse caminho ao enfermeiro; é uma brecha de API.
- **Proposta:** em `update-fila.service.ts`, recusar `status: 'Alta'` (403 para quem não for médico, ou apontar para o endpoint `PATCH …/alta`) e remover `ALTA_STATUSES`/o ramo `:49-57` se o caminho único for o `PATCH`.

## 7. `patients/:id/visitas` e `/chat` sem restrição de perfil
- **Confirmado.** `BE/modules/visitas/presentation/visitas.controller.ts:6-32`: nenhum `@Roles`. `GET patients/:id/visitas` (`:14`) e `PATCH patients/:id/visitas/fechar` (`:20`) servem qualquer usuário autenticado (os 3 perfis). O guard global (`BE/app.module.ts:41-42`) exige só JWT quando não há `@Roles` (`BE/shared/guards/roles.guard.ts:60`).
- `BE/modules/chat/presentation/chat.controller.ts:16` documenta que o chat é aberto a todos; o acesso por conversa é verificado no serviço (participação).
- **Impacto real:** `PATCH …/visitas/fechar` permite a **recepção** encerrar a visita de qualquer paciente com desfecho/risco/observações; a interface não chama essa rota (`grep` em `FE/`: sem uso).
- **Proposta:** `@Roles('medico','enfermeiro')` no `GET` e `@Roles('medico')` no `PATCH`; ou remover o `PATCH` se continuar sem uso. Chat pode ficar aberto aos 3 perfis (decisão de regra).

## 8. Dado clínico acessível à recepção (achados novos)
- `BE/modules/patients/presentation/patients.controller.ts:22-26`: `GET /patients` permite `recepcionista` e devolve `findAllWithVitals` com `relations: ['sinaisVitais']` (`BE/modules/patients/infrastructure/typeorm-patients.repository.ts:26-32`) — ou seja, **alergias, medicamentos, anamnese e todos os sinais vitais** de todos os pacientes. O comentário do próprio controller (`:34`) diz que só médico/enfermeiro acessam dados clínicos detalhados, o que vale para `GET /patients/:id` (`:35-36`) mas não para a listagem.
- `BE/modules/metricas/presentation/metricas.controller.ts:15,22` libera `/metricas` e `/metricas/historico-pacientes` para os 3 perfis; `BE/modules/metricas/application/calcular-metricas.ts:61-71,143-147` devolve o motivo clínico com valores (ex.: "SpO₂ 91% · FC 110 bpm") na lista de atenção.
- **Proposta:** na listagem para recepção, devolver só campos cadastrais (DTO de resposta sem `sinaisVitais`, `alergias`, `medicamentos_em_uso`, `anamnese`); em `/metricas`, ocultar `atencao[].motivo` para `recepcionista`. Confirmar com o orientador se a recepção deve ver "paciente crítico" sem valores.

## 9. `DELETE` sem encerrar a visita
- **Confirmado.** `BE/modules/fila/application/delete-fila.service.ts:13-22` só chama `filaRepository.remove` e emite o evento: não fecha a visita, não altera `ativo`. Resultado: a visita fica `Em Atendimento` indefinidamente (`visita.entity.ts:31-32`), o paciente continua `ativo=true`, e a classificação (`fila.gravidade`) se perde (só é copiada para `visitas.gravidade_manchester` ao fechar — `close-visita.service.ts:23`).
- Na readmissão, `create-visita.service.ts:14-15` **reaproveita** a visita aberta (a "nova" visita herda `chegada` e `motivo_visita` antigos).
- **Proposta:** em `DeleteFilaService`, fechar a visita com desfecho explícito (ex.: `Saida Voluntaria` ou um novo `Removido`), copiar `gravidade` para a visita e decidir sobre `ativo`; se a regra for "remoção = erro de cadastro", registrar `observacoes`.

## 10. Unicidade da senha de atendimento
- **Não existe garantia no backend nem no banco.**
  - A senha chega pronta do cliente (`create-fila.dto.ts:16-18`, `@MaxLength(20)`); a migration `BE/database/migrations/1780358400000-CreateFilaPacientes.ts:21` define `senha varchar` **sem `UNIQUE` e sem índice**.
  - Não há `UNIQUE` em `fila_pacientes.paciente_id` (`:18`); a recusa de paciente duplicado é "ler e depois inserir": `BE/modules/fila/application/create-fila.service.ts:21-27` (`findByPacienteId` → `createAndSave`), vulnerável a corrida entre duas sessões (duas admissões simultâneas passam pela checagem).
  - A senha é calculada no navegador: `FE/context/CareContext.tsx:31-37` (`proximaSenha`: maior `PR-NNN` **presente** na esteira + 1), usada em `FE/components/AdmitirModal/index.tsx` e `FE/pages/MobileTriage/index.tsx:458,730`.
- **Consequências comprovadas/deduzidas:**
  - *Histórica:* a senha é reutilizada depois que o paciente sai (execução F12 de 29/10: readmissão recebeu `PR-007`, a mesma de um paciente já saído — `resultados.json`, F12). Com a esteira vazia, volta a `PR-001` todo dia/ciclo. Não há reinício diário nem escopo por data.
  - *Concorrência:* dois clientes que leem a esteira ao mesmo tempo geram o mesmo número (dedução pela leitura; **não testado**).
  - *HEAD:* o /mobile usava `mobileCounter` local (`PR-001` repetido ao recarregar); a WT corrigiu para `proximaSenha`, que depende do estado do cliente.
- **Proposta:** gerar a senha no backend (sequência por dia, ex.: tabela/sequence ou `MAX+1` em transação com lock), `UNIQUE (data, senha)` e `UNIQUE (paciente_id)` em `fila_pacientes`. Migration: `AddUnicidadeFila` (cuidado com dados existentes duplicados).

## 11. Termos de Uso e Política de Dados × código
| Texto na interface | Onde | Código real |
|---|---|---|
| "Modo Local (Ollama — Qwen2.5:7b)" | `FE/components/TermosUsoModal/index.tsx:272`; `FE/pages/PoliticaDados/index.tsx:146`; `FE/utils/gerarPDFPolitica.ts:197` | Não existe provedor Ollama; único provedor é Groq (`BE/modules/ai/infrastructure/groq-chat.provider.ts:6`) |
| "Modo Nuvem (Groq API — Llama 3.3-70b)" | `TermosUsoModal:278`; `PoliticaDados:150`; `gerarPDFPolitica.ts:198` | Modelo é `openai/gpt-oss-120b` (`groq-chat.provider.ts:7`); transcrição `whisper-large-v3-turbo` (`BE/modules/ai/application/audio-transcription.service.ts:23`) |
| "Groq/Ollama" como provedores de apoio clínico | `TermosUsoModal:223`; `gerarPDFPolitica.ts:166` | Só Groq |
| "exigindo anonimização prévia" | `TermosUsoModal:280`; `gerarPDFPolitica.ts:198` | **Não há anonimização:** o prompt interpola o nome (`groq-chat.provider.ts:14`), alergias, medicamentos, sinais e anamnese (`:15-18`) |
| "data de nascimento" | `TermosUsoModal:179`; `PoliticaDados:79`; `gerarPDFPolitica.ts:142` | Modelo só guarda `idade` (`BE/modules/patients/domain/paciente.entity.ts:18-19`) |
- **Proposta:** corrigir os três arquivos para "Groq (`openai/gpt-oss-120b`) e Whisper para transcrição", remover o "modo local", trocar "data de nascimento" por "idade" e trocar a promessa de anonimização por "os dados clínicos e o nome são enviados ao provedor". Isso é decisão de texto jurídico — validar com o orientador. Nota: o prompt também pede "sugira o CID provável" (`groq-chat.provider.ts:26`); versão da CID não é indicada.

## 12. Perfis
- **Confirmado.** `BE/modules/auth/domain/user.entity.ts:3`: `UserRole = 'medico' | 'recepcionista' | 'enfermeiro'`; `role` é `varchar` livre no banco (`:19-20`), sem `CHECK`. Não existe perfil de administração; usuários só nascem pelo seed (`BE/database/seed.ts`). Nenhum perfil foi criado.
- **Proposta:** nenhuma mudança necessária; se quiser rigor, `CHECK (role IN (...))` em migration.

---
**Decisões que dependem do autor/orientador:** (a) quem pode dar alta da observação e remover da esteira (hoje só médico); (b) se a recepção pode ver alertas com valores e a listagem com dados clínicos; (c) fonte da senha (backend × cliente) e política de reinício; (d) texto jurídico dos Termos/Política.
