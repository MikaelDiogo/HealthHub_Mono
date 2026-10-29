# 11 — Evolução estrutural: registro de rastreabilidade (E2 + E3)

Base: commit `70190bf` + alterações **não commitadas** na branch local `evolucao-estrutura`. Node 24.20.0, npm 11.19.0. Dados fictícios, banco de teste isolado (porta 5435), IA/áudio só com mock.

## O que foi feito (e o que não foi)

| Item | Estado |
|---|---|
| E2 — autoria e horário de cada etapa (admissão, sinais, triagem, consulta/chamada, observação, alta, remoção) | Implementado |
| E3 — rastreabilidade da cor escolhida **manualmente** (quem, quando, justificativa opcional), preservada após alta/remoção | Implementado |
| E1 — motivo da chegada | Mínimo: exibe o `motivo_visita` já existente no cartão da esteira. Sem lista de queixas, sem migração |
| E4, E5, E6, E7 | **Não implementados** (trabalho futuro) |
| E8 — controle de prazo/alerta de estouro | **Não implementado**: os tempos de cada cor continuam só como rótulo. Depende de fonte/autorização do GBCR |

"Chamada" e "consulta iniciada" são o mesmo evento (separá-los seria E7).

## Onde mudou (arquivo:linha)

- Migração reversível: `HealthHub-BackEnd/src/database/migrations/1783200000000-CreateFilaEventos.ts` (tabela `fila_eventos`, 3 FKs, 2 índices).
- Módulo novo: `src/modules/eventos/` (entidade, repositório, `RegistrarEventoService`, `ListarEventosPacienteService`, `GET patients/:id/eventos` com `@Roles('medico','enfermeiro')` em `eventos.controller.ts:10-11`).
- Registro de eventos: `create-fila.service.ts:37`, `update-fila.service.ts:78`, `discharge-fila.service.ts:36`, `delete-fila.service.ts:24`, `create-sinais-vitais.service.ts:39`.
- DTO: `update-fila.dto.ts:20` (`justificativa` opcional, máx. 500).
- Frontend: `src/utils/eventos.ts` (rótulos e aviso), `CareContext.tsx:43,106` (justificativa), `pages/Alerts/index.tsx` (campo de justificativa, nota de limite, motivo), `pages/Patients/index.tsx` (Histórico › "Registro de eventos").

## Provas

| Prova | Resultado | Log |
|---|---|---|
| Testes escritos antes da implementação (falharam) | backend: 8 falhas + 2 arquivos sem importar; frontend: 1 arquivo falhou | `logs/evolucao_antes_backend.log`, `logs/evolucao_antes_frontend.log` |
| Testes depois | backend 13 arquivos / **101** testes; frontend 5 arquivos / **20** testes | `logs/evolucao_depois_*.log` |
| Migração: run → revert → run | tabela criada/removida; `pacientes` e `visitas` preservados | `logs/evolucao_migration.log` |
| E2E por API (banco de teste, 14 verificações) | **14/14** | `logs/e2e_eventos.log`, `logs/e2e_eventos_resultado.json`, script `mock/e2e_eventos.mjs` |
| Regressão em cópia limpa (`npm ci` + build + testes) | backend build 0, 101/101; frontend build 0, 20/20 | `logs/final_regressao_*.log` |

O E2E confirmou: ordem dos eventos do fluxo completo; cor, justificativa, autor (nome + perfil) e data ISO no evento de classificação; cor preservada quando o paciente é removido da esteira; recepção recebe 403, sem login 401, enfermeiro 200; enfermeiro tentando "Alta" por PUT recebe 403 **sem** gerar evento; justificativa > 500 caracteres recebe 400.

## O que NÃO prova

- Não prova que a tela mostra o registro (isso depende das capturas da execução final; ver `LEIAME.md` do pacote).
- Não prova fidelidade ao Protocolo de Manchester: a cor continua escolhida manualmente; o sistema não classifica, não sugere prioridade e não controla prazos.
- O registro é "melhor esforço", **não transacional**: se a gravação do evento falhar, o erro vai ao console e a ação principal continua.
- Não há retroação: registros anteriores à função não têm autoria.
- Recepção não lê o registro (403).
- Sem teste de carga, usabilidade ou concorrência para esta função.

## Depende do GBCR / externo

Conteúdo autorizado do protocolo, treinamento, avaliação de fidelidade, licença de uso, e qualquer tempo-alvo/alerta (E8).
