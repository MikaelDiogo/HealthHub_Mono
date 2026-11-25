# Conferência dos textos legais (rodada 6)

Commit: `2fe065034d539b27f5b467f71951039bef86c6f6`. T = modal de termos (pela tela), P = página da Política (pela tela), F = PDF da política (texto extraído com pdftotext). Entre parênteses: número de ocorrências. "—" = não se aplica a esse texto.

| Item | Frase | Tipo | T | P | F |
|---|---|---|---|---|---|
| A1 | Zod | deve estar AUSENTE | OK (0) | OK (0) | OK (0) |
| A2 | Logs de auditoria | deve estar AUSENTE | OK (0) | OK (0) | OK (0) |
| A3 | "registros de autenticação" | deve estar AUSENTE | OK (0) | OK (0) | OK (0) |
| A4 | "exclusão de prontuários" | deve estar AUSENTE | OK (0) | OK (0) | OK (0) |
| A5 | promessa de "e-mail do responsável" | deve estar AUSENTE | OK (0) | OK (0) | OK (0) |
| A6 | "Última atualização: junho/2026" | deve estar AUSENTE | — | OK (0) | — |
| A7 | "nascimento" (trava da rodada 4) | deve estar AUSENTE | OK (0) | OK (0) | OK (0) |
| P1 | validação no backend (class-validator) | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P2 | Registro de eventos da esteira | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P3 | conexão SSL "prevista" para produção | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P4 | HTTPS "previsto" para produção | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P5 | "prevista/previsto para o ambiente de produção" (SSL e HTTPS: 2 ocorrências) | deve estar PRESENTE | OK (2) | OK (2) | OK (2) |
| P6 | 10 tentativas por IP a cada 15 minutos em produção | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P7 | tokens JWT "não armazenados no servidor" | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P8 | "limite aplicado pela tela" (4 mensagens) | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P9 | direitos: "sem funcionalidade automática no sistema" | deve estar PRESENTE | OK (1) | OK (1) | OK (1) |
| P10 | última atualização "novembro de 2026" | deve estar PRESENTE | — | OK (1) | — |
| P11 | título "Contato do responsável" | deve estar PRESENTE | OK (2) | — | OK (2) |
| P12 | aceitação "registrada no navegador do usuário" | deve estar PRESENTE | — | — | OK (1) |

**Resultado:** 50 de 50 verificações OK; falhas: nenhuma.
