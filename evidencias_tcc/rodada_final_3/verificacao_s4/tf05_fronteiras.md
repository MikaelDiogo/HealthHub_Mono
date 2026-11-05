# TF05 — alertas nas fronteiras exatas (Apêndice A)

Funções reais: `spo2Status`, `fcStatus`, `tempStatus` (frontend) e `motivoCritico` (backend). **Não valida clinicamente os pontos de corte**; confere só o que o código implementa. Pressão (pressaoStatus, texto livre): formato inválido = sem alerta.

| Sinal | Valor | Frontend (estado) | Esperado (limiar implementado) | Backend: "crítico"? | Confere |
|---|---|---|---|---|---|
| SpO₂ | 91 | critical | critical | sim | sim |
| SpO₂ | 92 | warning | warning | não | sim |
| SpO₂ | 94 | warning | warning | não | sim |
| SpO₂ | 95 | normal | normal | não | sim |
| SpO₂ | 96 | normal | normal | não | sim |
| FC | 59 | critical | critical | sim | sim |
| FC | 60 | normal | normal | não | sim |
| FC | 90 | normal | normal | não | sim |
| FC | 91 | warning | warning | não | sim |
| FC | 100 | warning | warning | não | sim |
| FC | 101 | critical | critical | sim | sim |
| Temperatura | 37.7 | normal | normal | não | sim |
| Temperatura | 37.8 | warning | warning | não | sim |
| Temperatura | 39 | warning | warning | não | sim |
| Temperatura | 39.1 | critical | critical | sim | sim |
| Pressão | 90/60 | critical | critical | sim | sim |
| Pressão | 91/60 | warning | warning | não | sim |
| Pressão | 100/60 | warning | warning | não | sim |
| Pressão | 101/70 | normal | normal | não | sim |
| Pressão | 139/89 | normal | normal | não | sim |
| Pressão | 140/80 | warning | warning | não | sim |
| Pressão | 120/90 | warning | warning | não | sim |
| Pressão | 179/119 | warning | warning | não | sim |
| Pressão | 180/80 | critical | critical | sim | sim |
| Pressão | 120/120 | critical | critical | sim | sim |
| Pressão | 220/130 | critical | critical | sim | sim |

Resultado: 26/26 conferem. Observação: o backend só tem o nível "crítico" (não tem "atenção"), por isso a coluna do backend compara apenas esse nível.
