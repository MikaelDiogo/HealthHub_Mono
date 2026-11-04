# Etapa 8: conferência entre o código e o que o TCC afirma

Data: 04/11/2026. Código conferido: commit `98b375d` (o mesmo testado no clone limpo). Método: leitura do código, com busca por termos; nenhum código foi alterado por causa desta etapa. Caminhos relativos a `HealthHub-BackEnd/src/` salvo indicação.

## Os 18 itens

| # | O que o TCC afirma | Resultado | Onde está e o que foi encontrado |
|---|---|---|---|
| 1 | Senhas com bcryptjs, custo 12; comparação com `bcrypt.compare` | **Confere** | `modules/auth/application/auth.service.ts:3,27` (`bcrypt.compare`); `database/seed.ts:43` (`bcrypt.hash(..., 12)`). O seed é o único ponto que grava senha: não há rota de cadastro de usuário |
| 2 | Guard global de autenticação (JWT), exceto `POST /login` e `GET /health` | **Confere** | `app.module.ts:45` (`JwtAuthGuard` como `APP_GUARD`; o `RolesGuard` global está na linha 46); `@Public()` só em `modules/auth/presentation/auth.controller.ts:17` e `modules/health/health.controller.ts:16` |
| 3 | JWT expira em 1 dia, sem refresh nem revogação | **Confere** | `app.module.ts:29` (`expiresIn: '1d'`); busca por `refresh` e `revog` no backend: nenhuma ocorrência. Termos de uso e página da política dizem "24 horas" (equivale) |
| 4 | Limite de tentativas de login: 10 por 15 minutos (`ThrottlerGuard` só na rota de login) | **Diverge em parte** | `modules/auth/presentation/auth.controller.ts:18-19`: `@Throttle({ default: { limit: isProduction ? 10 : 100, ttl: 15 min } })`. O 10 vale **só com `NODE_ENV=production`**; fora de produção o limite é **100**. O `ThrottlerGuard` está só no login (confere). O `ThrottlerModule.forRoot` global (`app.module.ts:31`, 100 por 15 min) não tem guard global, então não vale para as outras rotas |
| 5 | `helmet()` ativo e corpo limitado a 10 kb | **Confere** | `main.ts:26-29` (`helmet()`; só o `/api/docs` recebe `helmet` sem CSP quando o Swagger está ligado); `main.ts:22,33-34` (`bodyParser: false`, `json({ limit: '10kb' })` e `urlencoded`). O upload de áudio (multer) não passa por esse limite: tem o seu, de 25 MiB |
| 6 | Permissões por perfil (`@Roles`) | **Confere, com 2 ressalvas** | Matriz completa abaixo. Ressalvas: (a) "classificar a cor só o enfermeiro" **não** está no `@Roles` (a rota `PUT /fila/:id` aceita médico e enfermeiro); a recusa ao médico vem do serviço (`modules/fila/application/update-fila.service.ts:50-52`), e a recepção é barrada antes pelo guard, com a mensagem genérica (S4); (b) as rotas do chat e `GET /patients/:id/visitas` não têm `@Roles` (qualquer perfil autenticado) |
| 7 | Nove entidades persistidas e dez migrações na versão anterior | **Confere; agora 11 migrações** | 9 `@Entity`: users, conversations, conversation_participants, messages, pacientes, sinais_vitais, fila_pacientes, fila_eventos, visitas. Migrações em `database/migrations/`: **11** (a nova é `1783500000000-CadastroMinimoNomeProvisorio`; a pressão estruturada da Opção A **não** foi incluída, então não há 12ª) |
| 8 | `synchronize=false`; API na 3001; PostgreSQL de dev na 5433; banco de teste na 5435; Swagger em `/api/docs` (desligado em produção) | **Confere, com ressalva** | `config/typeorm.config.ts:23` e `database/data-source.ts:33` (`synchronize: false`); `main.ts:66` (3001 por padrão); `docker-compose.yml:11` (`5433:5432`); `config/swagger.ts:4` (`api/docs`). A **5435 não vem do repositório**: é o contêiner de teste usado nas verificações. Swagger: `swaggerHabilitado` (`config/swagger.ts:7-11`) desliga em produção **por padrão**, mas `SWAGGER_ENABLED=true` o liga mesmo em produção |
| 9 | Senha gerada no servidor, na transação de admissão; índice único em `fila_pacientes(paciente_id)`; 409 se já está na fila | **Confere** | `modules/fila/infrastructure/typeorm-fila.repository.ts:46-54` (transação, `pg_advisory_xact_lock`, maior `PR-NNN` + 1), `:49` e a captura do código `23505` (`ConflictException`); `database/migrations/1783400000000-UniqueFilaPorPaciente.ts`; `modules/fila/application/create-fila.service.ts:18-20` (senha do cliente ignorada) |
| 10 | Contexto da IA só com alergias, medicamentos, anamnese, últimos sinais e histórico (4 enviadas pelo frontend; backend não limita); modelo `openai/gpt-oss-120b` (`max_tokens` 1024); Whisper `whisper-large-v3-turbo` (30 s, abaixo de 25 MiB, em memória) | **Confere** | `modules/ai/application/clinical-chat.service.ts:22-35` (`contextoSemIdentificacao`); `modules/ai/infrastructure/groq-chat.provider.ts:7-8,54`; frontend `pages/Monitoring/index.tsx:107` (`slice(-4)`); `modules/ai/presentation/ai.controller.ts:21,40` (sem limite no histórico), `:47-48` (`memoryStorage`, 25 MiB); `modules/ai/application/audio-transcription.service.ts:23,32` |
| 11 | O prompt orienta hipóteses diagnósticas e sugestão de CID; o modelo não altera a cor nem a esteira | **Confere em parte** | `groq-chat.provider.ts:9-26`: o prompt pede "sugira o CID provável" e "referências a diretrizes", mas **não usa a expressão "hipóteses diagnósticas"** (pede "sua melhor análise"). A IA só devolve texto (não chama a fila): S7 comprovou que a cor e o status ficam iguais depois de uma pergunta |
| 12 | `fila_eventos`: só acréscimo; registra admissão, sinais, início de triagem, classificação, início de consulta, observação, alta e remoção; `fila_id` sem FK; `visita_id` e `usuario_id` com `SET NULL` | **Confere** | `modules/eventos/infrastructure/*.ts:23` (só `repo.insert`; nenhum update ou delete no módulo); tipos gravados: `admitido`, `sinais_registrados`, `triagem_iniciada`, `consulta_iniciada`, `observacao_iniciada`, `classificado`, `alta`, `removido_da_fila` (mais `status_alterado` para outras mudanças); `database/migrations/1783200000000-CreateFilaEventos.ts`: FK de `visita_id` e `usuario_id` com `SET NULL`, e **nenhuma FK em `fila_id`**. A gravação é "melhor esforço": falha só vai para o log (`registrar-evento.service.ts:36-51`) |
| 13 | A rota de fechar visita não registra evento; o evento de alta está em `PATCH /fila/:id/alta` | **Confere** | `modules/visitas/application/close-visita.service.ts` e `visitas.controller.ts`: sem chamada ao registro de eventos. `modules/fila/application/discharge-fila.service.ts` registra `alta` |
| 14 | Limiares: SpO₂ < 92 crítico e < 95 atenção; FC < 60 ou > 100 crítica e > 90 atenção; temperatura > 38,5 crítica e >= 37,8 atenção; pressão sem alerta | **Confere** | Agora centralizados com fonte em `config/limiares-sinais-vitais.ts` (backend, só "crítico") e `HealthHub-Project/src/config/limiaresSinaisVitais.ts`; valores idênticos aos de antes (testes antigos passam sem alteração). O backend só tem o nível "crítico" |
| 15 | Faixas de recusa: FC 0 a 300, SpO₂ 0 a 100, temperatura 25 a 45, pressão até 20 caracteres | **Confere** | `modules/sinais-vitais/presentation/dtos/create-sinais-vitais.dto.ts:8-9,15-16,21,27-28` |
| 16 | Transições de estado na esteira não são validadas (salto aceito) | **Confere** | `modules/fila/domain/fila-valores.ts:2` ("não define transições entre status"); S8 e TF06 observaram o salto aceito (HTTP 200) |
| 17 | Ordenação por cor (Vermelho, Laranja, Amarelo, Verde, Azul), não classificados no fim, desempate por `created_at` (servidor) | **Confere** | `modules/fila/application/list-fila.service.ts:5-24`; S1, S2 e S3 aprovados no clone |
| 18 | O painel (`GET /metricas`) usa visitas dos últimos 60 dias | **Confere** | `modules/metricas/application/metricas.service.ts:21-23` (60 dias; os números do período usam 30, e os outros 30 servem para achar a visita anterior da readmissão) |

## Matriz rota × perfil (gerada do código)

Perfis: M = médico, E = enfermeiro, R = recepcionista. "autenticado" = qualquer perfil, sem `@Roles`. O `RolesGuard` é global: rota sem `@Roles` é liberada para quem estiver autenticado.

| Método e rota | M | E | R | Observação |
|---|:-:|:-:|:-:|---|
| `POST /login` | pública | pública | pública | limite de tentativas (item 4) |
| `GET /health` | pública | pública | pública | |
| `GET /patients` | sim | sim | sim | |
| `POST /patients` | sim | sim | sim | só o nome é obrigatório |
| `GET /patients/:id` | sim | sim | não | dados clínicos detalhados |
| `PUT /patients/:id` | sim | sim | não | a recepção não corrige o nome provisório |
| `GET /patients/:id/vitals`, `GET /sinais/:patientId/vitals` | sim | sim | não | histórico de sinais |
| `POST /sinais/:id` | sim | sim | não | registrar sinais vitais |
| `GET /patients/:id/eventos` | sim | sim | não | registro de eventos |
| `GET /patients/:id/visitas` | sim | sim | sim | autenticado (sem `@Roles`) |
| `PATCH /patients/:id/visitas/fechar` | sim | não | não | não registra evento |
| `POST /patients/:id/chat`, `POST /patients/:id/chat/audio` | sim | sim | não | IA |
| `GET /fila` | sim | sim | sim | |
| `POST /fila` | sim | sim | sim | admissão |
| `PUT /fila/:id` | sim | sim | não | mudar etapa; **cor: só o enfermeiro** (regra do serviço, 403 para o médico); **alta por esta rota: só o médico** |
| `PATCH /fila/:id/alta` | sim | não | não | |
| `DELETE /fila/:id` | sim | não | não | remover da esteira |
| `GET /metricas`, `GET /metricas/historico-pacientes` | sim | sim | sim | |
| `GET /chat/contacts`, `GET /chat/conversations`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations`, `POST /chat/conversations/:id/messages`, `POST /chat/conversations/:id/read` | sim | sim | sim | autenticado; a regra de participação é do serviço (RN-06) |

## Outras inconsistências encontradas (não corrigidas)

1. **Item 4** (acima): o "10 por 15 minutos" vale só em produção; no desenvolvimento e nos testes o limite é 100.
2. **Nome do autor em telas.** Os Termos de uso (`components/TermosUsoModal/index.tsx:339`), a página da Política (`pages/PoliticaDados/index.tsx:176`) e o PDF da política (`utils/gerarPDFPolitica.ts:246`) trazem "Autor: <nome completo do autor>". É crédito de autoria, não nome de usuário do seed, mas aparece em tela e em PDF. Decisão do autor: manter ou remover antes de usar essas telas em capturas (as capturas desta rodada evitam o trecho do rodapé).
3. **Nomes diferentes para o mesmo conceito:** a visita grava `classificacao_risco`; a esteira (`fila_pacientes`, `FilaPaciente`, DTO de atualização e eventos) continua usando `gravidade`. O TCC deve usar um termo só ao descrever.
4. **Limite do nome:** o formulário limita a 100 caracteres e o backend aceita até 150 (decisão do autor: manter 150; antes o backend exigia no mínimo 3).
5. **Mensagem de recusa (S4):** a recepção recebe "Acesso negado para este perfil" (guard) e não "Apenas o enfermeiro pode atribuir a categoria de risco." (serviço). Já registrado na rodada anterior; permanece.
6. **`evidencias_tcc/01_versao.md:48`** cita o nome real do seed e a linha 22 do `seed.ts`; está desatualizado (o seed passou a ter nomes fictícios). É evidência histórica e não foi alterada; o `LEIA-ME_EVIDENCIAS_ANTIGAS.md` explica que é anterior à mudança.
7. **README raiz:** lista a senha do banco de desenvolvimento local em texto (`healthhub2026`, do contêiner Docker local). É senha de ambiente local de desenvolvimento, não de produção; vale trocar por um valor de exemplo antes de publicar na VPS.
8. **Documentação:** o `DOCUMENTO_ENGENHARIA_SOFTWARE.md` usa numeração própria de RF/RNF, diferente da do TCC (já avisado antes); a linha do tempo de migrações e o diagrama de classes foram atualizados nesta rodada.
9. **Rotas sem `@Roles`:** as do chat e `GET /patients/:id/visitas` aceitam qualquer perfil autenticado (a recepção lê as visitas e não lê os eventos; é o que o TCC descreve na Figura 25, mas convém dizer "qualquer perfil autenticado" no texto).
10. **Swagger:** `SWAGGER_ENABLED=true` o liga em produção; o TCC deve dizer "desligado por padrão em produção".
