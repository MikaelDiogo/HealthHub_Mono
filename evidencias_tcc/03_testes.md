# 03 — Testes automatizados e cobertura (T3)

Coleta em 29/10/2026. Saídas brutas: `logs/testes_backend.log`, `logs/testes_frontend.log`, `logs/cobertura_backend.log`. Ambiente: Node 24.20.0, Vitest 5.0.4.

## 1. Execução agora
| Pacote | Arquivos | Testes | Falhas | Código de saída |
|---|---|---|---|---|
| Backend | 3 | **13 passaram** | 0 | 0 |
| Frontend | 4 | **15 passaram** | 0 | 0 |
| **Total** | 7 | **28** | 0 | |

Os números conferem com os relatórios de 29/10 (13 e 15). Todos são testes **unitários** de funções/serviços puros (repositórios simulados à mão). **Não há** teste de API (HTTP), de banco, de interface, de integração nem E2E versionado; as execuções de 29/10 (22 casos) foram feitas por **script de navegador fora do repositório de testes** (`HealthHub_Testes_Rodada2/scripts`).

## 2. Cobertura de código
**Não medida.** `npx vitest run --coverage` falha com `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'` (`logs/cobertura_backend.log`, código 1). Nenhum dos pacotes tem o provedor de cobertura em `devDependencies`. Para medir é preciso **adicionar essa dependência** (alteração em `package.json`/lockfile; não fiz). Por isso **não existe percentual** por módulo, e o TCC não deve citar nenhum.

## 3. O que os 28 testes cobrem
| Arquivo | Testes | Cobre |
|---|---|---|
| `fila/application/list-fila.service.spec.ts` | 4 | Ordem Vermelho→Azul; desempate por chegada; **sem classificação por último**; não altera o array de entrada |
| `fila/application/update-fila.service.spec.ts` | 4 | Só o **enfermeiro** classifica (médico → 403); **sem sinais vitais → bloqueia**; com sinais classifica; mudar só o status não exige papel |
| `metricas/application/calcular-metricas.spec.ts` | 5 | Readmissão ≤ 30 dias; dia civil de Brasília; sinais críticos antes de espera longa; limiares de `motivoCritico` |
| `services/metricas.spec.ts` (frontend) | 3 | Formatação de duração; "há N dias"; **senha sequencial** `proximaSenha` |
| `utils/vitalStatus.spec.ts` | 3 | Limiares SpO₂ (<92 crítico, <95 atenção), FC (<60 / >100), temperatura (≥37,8) |
| `utils/aiResponse.spec.ts` | 5 | Resposta da IA malformada não quebra a tela |
| `utils/erro.spec.ts` | 4 | Mensagem de erro da API ("Bad Request", 403, rede) |

## 4. Requisitos críticos (documento 02) sem teste automatizado
Legenda: **Sem** = nenhum teste; **Parcial** = só a lógica pura é testada, não o caminho real.

| Requisito | Situação | Observação |
|---|---|---|
| RF09 ordem da fila (backend) | Parcial | Função `ordenarPorManchesterEChegada` testada; **não** a rota `GET /fila`. O sort do **/mobile** (`MobileTriage/index.tsx`, inline) **não tem teste** |
| RF11 bloqueio de classificação sem sinais | Parcial | Testado com repositório simulado que devolve lista vazia. **Não** cobre `POST /sinais/:id` com corpo vazio `{}` (aceito pelo backend: ver `05_achados.md`) |
| RNF04 autorização por perfil | **Sem** | Nenhum teste do `RolesGuard` nem da matriz de `@Roles` por rota. É a regra que o F13 verificou só pela interface/API manual |
| RF12 alta (`PATCH /fila/:id/alta` e `PUT status=Alta`) | **Sem** | `discharge-fila.service.ts` sem teste; o caminho `PUT … status "Alta"` (aberto ao enfermeiro) também |
| Limiares de sinais vitais | Parcial | Frontend e `motivoCritico` testados; **não há teste que compare os dois lados** nem os limites da DTO (temperatura 25–45, SpO₂ 0–100, FC 0–300); PA sem limiar |
| RF17 upload de áudio | **Sem** | `audio-transcription.service.ts` e o filtro do `multer` (MIME `audio/*`, 25 MB) sem teste |
| RF16 chat de IA | **Sem** | `clinical-chat.service.ts` e `groq-chat.provider.ts` sem teste (erro 503 sem chave, timeout, resposta vazia) |
| RF18 chat interno | **Sem** | Nenhum teste de `send-message`, `mark-as-read`, prioridade |
| RF08 senha de atendimento única | Parcial | Só `proximaSenha` (frontend). **Sem** teste de unicidade no backend/sob concorrência (não há `UNIQUE` no banco) |
| RF13 remoção sem encerrar visita | **Sem** | `delete-fila.service.ts` |
| RNF01/RNF02/RNF05 hash, JWT, limitação de login | **Sem** | `auth` sem teste |

## 5. Testes propostos (**não criados; aguardo seu OK**)
Regras de todos: banco **simulado em memória** (repositórios falsos, como nos testes atuais) ou banco de teste isolado; **provedor de IA/áudio sempre mock**; nenhuma chamada à Groq; sem novas dependências, salvo onde indicado. Cada teste traz a frase "**Não prova**".

| # | Teste proposto | Tipo (dependências) | **Não prova** |
|---|---|---|---|
| P1 | `RolesGuard`: com `@Roles('medico')` o perfil `enfermeiro`/`recepcionista` recebe 403, sem usuário 401, sem `@Roles` passa | Unitário (nenhuma) | Que cada rota está decorada corretamente; que o guard é aplicado globalmente |
| P2 | **Matriz de permissões**: lê por reflexão (`Reflect.getMetadata`) o `@Roles` de cada método dos controllers de fila, pacientes, sinais, visitas, ai, métricas e compara com uma tabela esperada (inclui rotas **sem** `@Roles`, hoje `visitas` e `chat`) | Unitário (nenhuma) | Comportamento HTTP real; só garante que a configuração não mudou sem aviso |
| P3 | `UpdateFilaService`: `status "Alta"` por enfermeiro (caminho que hoje fecha a visita e inativa o paciente) e por médico; registra a decisão atual, seja ela qual for | Unitário (nenhuma) | Se essa regra é a desejada (decisão sua e do orientador) |
| P4 | `DischargeFilaService`: fecha a visita, inativa o paciente, remove da fila, emite `fila:changed` | Unitário (nenhuma) | Transação atômica no banco |
| P5 | `CreateSinaisVitaisDto` com `class-validator`: temperatura 24,9/25/45/45,1; SpO₂ −1/100/101; FC 300/301; `{}` | Unitário (nenhuma) | Que o `ValidationPipe` está ativo na aplicação |
| P6 | Paridade de limiares: valores de fronteira (SpO₂ 91/92, FC 59/60/100/101, Temp 38,5/38,6) iguais entre `vitalStatus.ts` (frontend) e `motivoCritico` (backend) | Unitário (nenhuma) | Valor clínico dos limiares (sem fonte clínica documentada) |
| P7 | `ordenarPorGravidade` do **/mobile**: extrair o `sort` para função pura e testar os 5 níveis + sem classificação | Unitário; **exige mover código** (precisa do seu OK por ser alteração) | Que a tela renderiza nessa ordem |
| P8 | `AudioTranscriptionService` e `ClinicalChatService` com **axios simulado**: sucesso, 401/429/500 do provedor, timeout, resposta sem texto, ausência de `GROQ_API_KEY` (503) | Unitário (nenhuma) | Qualidade da resposta/da transcrição; contrato real da Groq |
| P9 | `SendMessageService` e `MarkAsRead`: prioridade `normal`/`urgente`, participante inválido | Unitário (nenhuma) | Entrega por Socket.IO |
| P10 | API real com `supertest` + `@nestjs/testing` contra Postgres isolado: login, 401/403 por rota, admissão duplicada, classificação sem sinais | Integração (**novas devDependencies**: `@nestjs/testing`, `supertest`, `@types/supertest`) | Desempenho, navegador, rede real |
| P11 | Cobertura: adicionar `@vitest/coverage-v8` e script `test:cov` | Configuração (**nova devDependency**) | Qualidade dos testes (cobertura ≠ correção) |

Ordem sugerida pelo risco para o TCC: **P2, P1, P3, P4, P5, P6, P8** (todas sem dependência nova), depois P11 e P10.
