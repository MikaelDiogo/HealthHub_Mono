# 06 — Modelo documentado × código (T6)

**Data:** 29/10/2026 · **Versão:** `ef1f7e9` + alterações não commitadas (WT) · **Método:** leitura de entidades e migrations; nada foi implementado.
Caminhos relativos a `HealthHub-BackEnd/src/` (BE). Existem 8 tabelas: `pacientes`, `sinais_vitais`, `fila_pacientes`, `visitas`, `users`, `conversations`, `conversation_participants`, `messages` (7 migrations em `BE/database/migrations/`, a última `1783100000000-AddAtivoToPacientes.ts`).

> **Qualquer mudança de modelo depende de decisão do autor e do orientador (Prof. Adeilson).** Itens podem ficar como **trabalho futuro**; nada abaixo está implementado.

## Quadro: existe / não existe / parcial
| # | Item | Situação | Evidência (arquivo:linha) |
|---|---|---|---|
| 1 | Autoria de **quem classificou** | **Não existe** | `fila-paciente.entity.ts:4-31` não tem coluna de usuário; `update-fila.service.ts:35,42` verifica o papel (enfermeiro) mas não grava o `id`; `req.user` só é passado como `role` (`fila.controller.ts:40-41`) |
| 2 | Autoria de **quem chamou / deu alta** | **Não existe** | `discharge-fila.service.ts:30-32` e `close-visita.service.ts:12-27` não recebem usuário; `visita.entity.ts:8-38` sem coluna de autor |
| 3 | Autoria de **quem mediu os sinais** | **Não existe** | `sinais-vitais.entity.ts:5-33` sem `user_id`; `create-sinais-vitais.service.ts:13-29` não recebe o usuário (o controller não passa `req.user`) |
| 4 | Hora de **chegada** | **Existe** | `visita.entity.ts:19-20` (`chegada`, default `now()`); `fila-paciente.entity.ts:29-30` (`created_at`); `chegada varchar` livre (`:20-21`) |
| 5 | Hora de **início/fim da triagem** | **Não existe** | só `status` textual (`fila-paciente.entity.ts:23-24`), sem carimbo por mudança; `update-fila.service.ts:45` sobrescreve o status |
| 6 | Hora da **classificação** | **Não existe** | `gravidade` sem data (`fila-paciente.entity.ts:26-27`) |
| 7 | Hora da **chamada** e do **início da consulta** | **Não existe** | idem acima; a transição "Aguardando Atendimento → Em Consulta" não é registrada |
| 8 | Hora da **alta** | **Existe** | `visita.entity.ts:22-23` (`alta`, preenchida em `close-visita.service.ts:21`) |
| 9 | Hora de cada **medição de sinais** | **Existe** | `sinais-vitais.entity.ts:27-28` (`created_at`); `hora int` HHMM (`:12-13`) é redundante e depende do fuso do servidor |
| 10 | Entidade de **atendimento (encounter)** | **Parcial — a `Visita` cumpre o papel** | `visita.entity.ts:7-39` (paciente, chegada, alta, risco, motivo, desfecho, observações). Mas não referencia a `fila_pacientes` nem os `sinais_vitais`: estes se ligam só ao paciente (`sinais-vitais.entity.ts:9-10`, `fila-paciente.entity.ts:8-9`). Não há como saber "quais sinais pertencem a esta visita" senão por intervalo de datas. Reaproveita visita aberta (`create-visita.service.ts:14-15`) |
| 11 | **Classificação persistida** | **Parcial** | Fica em `fila_pacientes.gravidade` (`:26-27`), que é **apagada** na alta (`discharge-fila.service.ts:32`) e na remoção (`delete-fila.service.ts:20`). Só vai para `visitas.gravidade_manchester` (`visita.entity.ts:25-26`) **ao fechar** a visita (`close-visita.service.ts:23`). Na remoção por `DELETE`, perde-se. Também não há histórico de reclassificação |
| 12 | **Interação com a IA persistida** | **Não existe** | módulo `BE/modules/ai/` tem só `application`, `domain` (interface do provedor), `infrastructure`, `presentation`; nenhuma entidade/repositório. `clinical-chat.service.ts:29-31` repassa ao provedor sem gravar; áudio fica em memória (`ai.controller.ts:39-41`, `memoryStorage`) |
| 13 | **Data de nascimento** | **Não existe** (só idade) | `paciente.entity.ts:18-19` `idade int`; DTO `create-patient.dto.ts` valida `idade` 0–150. Idade envelhece e não permite cálculo por data do atendimento |
| 14 | **Frequência respiratória** | **Não existe** | ausente em `sinais-vitais.entity.ts:5-33` e no DTO |
| 15 | **Dor** (escala) | **Não existe** | ausente; só `anamnese` texto livre (`paciente.entity.ts:36-37`) |
| 16 | **Glicemia** | **Não existe** | ausente |
| 17 | **Pressão arterial estruturada** | **Parcial (texto)** | `sinais-vitais.entity.ts:21-22` `pressao_arterial varchar`; DTO `create-sinais-vitais.dto.ts:19-22` só limita 20 caracteres, sem formato `sis/dia`. Sem limiar de alerta (`utils/vitalStatus.ts`, `calcular-metricas.ts:61-71` ignoram PA) |
| 18 | Alergias / medicamentos | **Existe** (texto livre, no paciente) | `paciente.entity.ts:30-34`; não vinculados à visita |
| 19 | Status da fila | **Existe** como `varchar` livre | `fila-paciente.entity.ts:23-24`; sem enum nem tabela de transições (`update-fila.dto.ts:4-6`) |
| 20 | Perfil do usuário | **Existe** como `varchar` | `user.entity.ts:19-20`; sem `CHECK` |

Dois ajustes de integridade relacionados (ver `05_achados.md`): `fila_pacientes` sem `UNIQUE(paciente_id)` nem `UNIQUE(senha)` (`1780358400000-CreateFilaPacientes.ts:18,21`) e `fila_pacientes.paciente_id` com FK `ON DELETE CASCADE` (`:29-35`).

## Propostas de mudança mínima (não implementadas)
Ordem sugerida: o que sustenta a argumentação do TCC com menor custo vem primeiro. Cada migration seria **nova** e reversível; não alterar migrations existentes. Os nomes usam timestamps posteriores a `1783100000000`.

### A. Autoria e horários por etapa (itens 1–7)
- **Migration `AddAutoriaEHorariosNaFila`** — em `fila_pacientes`: `classificado_por uuid NULL`, `classificado_em timestamp NULL`, `triagem_iniciada_em timestamp NULL`, `chamado_em timestamp NULL`, `consulta_iniciada_em timestamp NULL`, `atualizado_por uuid NULL` (FK `users.id`, `ON DELETE SET NULL`).
- **Backfill:** nenhum possível (histórico não registra); linhas antigas ficam `NULL`.
- **Impacto de código:** `update-fila.service.ts` passa a receber `req.user.id` e carimbar o campo da etapa; `discharge-fila.service.ts`/`close-visita.service.ts` gravam `encerrada_por` em `visitas`.
- **Alternativa mais enxuta:** uma tabela `fila_eventos(id, fila_id|visita_id, status_anterior, status_novo, gravidade, usuario_id, em)` — registra **todas** as transições (inclusive reclassificação) sem alterar `fila_pacientes`. Mais flexível para o TCC; requer decisão.

### B. Visita como encontro e classificação persistente (itens 10–11)
- **Migration `LigarSinaisEFilaAVisita`:** `sinais_vitais.visita_id uuid NULL` (FK `visitas.id`) e `fila_pacientes.visita_id uuid NULL`.
- **Backfill:** associar cada sinal à visita cuja janela `chegada…coalesce(alta, now())` o contém; ambíguo se houver sobreposição → deixar `NULL`.
- **Migration `GravarClassificacaoNaVisita`:** `visitas.classificado_em timestamp NULL` (a cor já existe em `gravidade_manchester`); e passar a gravar a cor na visita **no ato da classificação** (não só na alta), o que corrige o item 9 de `05_achados.md` (perda na remoção).
- **Impacto:** `update-fila.service.ts` chama o repositório de visitas; sem quebra de API.

### C. Registro da interação com a IA (item 12)
- **Migration `CreateInteracoesIa`:** `interacoes_ia(id uuid, visita_id uuid NULL, paciente_id uuid, usuario_id uuid, modelo varchar, tipo varchar('chat'|'audio'), pergunta text NULL, resposta text NULL, tokens_entrada int NULL, tokens_saida int NULL, criado_em timestamp)`.
- **Backfill:** não se aplica.
- **Atenção LGPD/decisão:** gravar o conteúdo duplica dado de saúde; alternativa é gravar só metadados (quem, quando, modelo, tamanho). Decisão do autor/orientador.

### D. Dados clínicos ausentes (itens 13–17)
- **Migration `AddDataNascimentoAoPaciente`:** `pacientes.data_nascimento date NULL`; manter `idade` por compatibilidade até decisão. Backfill: impossível a partir de `idade`; se desejar aproximar, não gravar (evita dado inventado).
- **Migration `AddSinaisVitaisExtras`:** `sinais_vitais.frequencia_respiratoria int NULL`, `dor_escala smallint NULL (0–10)`, `glicemia float NULL`, `pa_sistolica smallint NULL`, `pa_diastolica smallint NULL`. Backfill de PA: converter o texto `120/80` com regex quando bem formado; manter `pressao_arterial` até a migração do frontend.
- **Impacto:** DTO, formulários (`Buttons/index.tsx`, `ModalEditPatient.tsx`, `MobileTriage`), limiares em `vitalStatus.ts`/`calcular-metricas.ts` (**sem fonte clínica documentada** — só o profissional de saúde define).

### E. Integridade (apoia os itens 10–11)
- **Migration `AddRestricoesFila`:** `UNIQUE (paciente_id)` e `UNIQUE (senha)` (ou `(data, senha)` com a senha gerada no servidor) em `fila_pacientes`; `CHECK (status IN (...))`; `CHECK (gravidade IN (...) OR gravidade IS NULL)`; `CHECK (role IN (...))` em `users`. Pré-requisito: checar duplicatas existentes antes de aplicar.

## O que o TCC pode afirmar hoje
- Existem: paciente, sinais vitais (FC, SpO₂, temperatura, PA em texto), fila, visita (chegada, alta, risco, motivo, desfecho), usuários com 3 perfis, chat interno persistido.
- **Não existem:** autoria das ações clínicas, horários por etapa (exceto chegada, alta e cada medição), registro das interações com a IA, data de nascimento, FR, dor, glicemia, PA estruturada.
- A `Visita` é o mais próximo de um "atendimento", mas sem vínculo direto com sinais e fila.
