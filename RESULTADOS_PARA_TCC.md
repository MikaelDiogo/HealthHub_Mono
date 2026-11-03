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
