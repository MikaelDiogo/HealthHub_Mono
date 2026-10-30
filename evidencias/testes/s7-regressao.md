# S7 — Regressão (checklist, marcado só com o que foi observado)

Ambiente: banco de teste isolado (porta 5435), API local (porta 3001) com provedor de IA **simulado**, paciente fictício. Log bruto: `s7-bruto.log`. Execução: `cenarios_accr.mjs s7`, 30/10/2026.

| Item | Observado | Marcado |
|---|---|---|
| Admissão pela recepção | entrada criada, status "Aguardando Triagem" | [x] |
| Registro de sinais vitais (enfermeiro) | HTTP 201; leitura devolvida em `GET /sinais/:id/vitals` (HTTP 200) | [x] |
| Alta pelo enfermeiro continua negada | HTTP 403 | [x] |
| Alta pelo médico | HTTP 204 | [x] |
| Chat de IA responde (provedor simulado) | HTTP 201, resposta rotulada "[RESPOSTA SIMULADA — NÃO É DO MODELO REAL]" | [x] |
| IA não atribui cor | `gravidade` da entrada continuou `null` depois do uso da IA | [x] |
| Limiares de alerta de sinais vitais (crítico/alerta/normal) inalterados | o diff de `vitalStatus.ts` só renomeia o mapa de cores e remove os tempos; as funções `spo2Status`, `fcStatus`, `tempStatus` não foram tocadas; `vitalStatus.spec.ts` verde (`logs vitest-frontend.log`) | [x] (por teste automatizado e leitura do diff; **não** reexecutado pela tela) |

Limite: este S7 não refaz o fluxo completo pela interface; cobre API + testes automatizados.
