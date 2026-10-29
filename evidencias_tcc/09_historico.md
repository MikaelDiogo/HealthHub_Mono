# 09 — Rastro de versões e ciclos (histórico do Git e dos registros)

**Escopo:** T9. Só leitura de `git log`, `git status`, `git diff --stat` e dos arquivos de resultado. **Isto não é um "ciclo DSR completo"**: lista apenas as evidências que existem. As correções de 29/10 **não estão commitadas** e **não houve avaliação com usuários**.

## 1. Estado do repositório (conferido agora)
- Branch `master`; último commit `ef1f7e9f26a8e19f475fb056b1839b4b1f75e172`, 16/09/2026 14:00 (-03:00).
- `git status -s`: **101 entradas** (7 apagadas, 58 modificadas, 36 não rastreadas). O número citado no TCC (92) e os de 29/10 (96 e 100) diferem porque mudaram ao longo do trabalho; o de agora inclui a própria pasta `evidencias_tcc/`.
- Tudo o que está nas seções 3 e 4 está **somente na árvore de trabalho** (nada commitado, nenhuma tag).

## 2. Linha do tempo dos commits (19 commits, 27/08 a 16/09/2026)
| Data | Commit | Mudança (mensagem do commit) | Motivo registrado |
|---|---|---|---|
| 27/08 10:38 | `132e98e` | interface mobile para triagem + migração do banco para Docker local | — |
| 27/08 10:12–11:52 | `fd88d59`, `6cf92b5`, `f7b7e93` | redesign do login, identidade visual, páginas Alertas/Monitoramento/Exportar PDF | — |
| 27/08 22:18 | `9bbde5a` | responsividade para todos os perfis + refactor visual slate | — |
| 27/08 22:34 | `26c67bf` | Escala de Manchester completa (5 níveis) + correção do modelo de IA | — |
| 28/08 08:39 | `0824acc` | IA clínica via **token OAuth do Claude Code** (sem SDK oficial), modelo `claude-sonnet-4-5` | mensagem: "Token 401→429 confirmado". **Atenção:** uso de token de assinatura no app contradiz a regra do próprio projeto (token só para avaliação) |
| 28/08 08:54 | `0f62cc7` | chat clínico via **Groq (`openai/gpt-oss-120b`)** | troca de provedor; motivo não está na mensagem |
| 28/08 10:12 | `35c86c0` | `PLANO_MIGRACAO.md` | — |
| 28/08 10:21 | `97ee3da` | migração do backend para NestJS (Clean Architecture) + chat WebSocket | — |
| 28/08 10:28–11:30 | `eda2149`, `5c2b3f1`, `0541186`, `d8014b7`, `0faea48`, `ca4475f` | chat interno: visual, painel de detalhes, campo de escrita, participantes reais do grupo e contagem | — |
| 03/09 19:44 | `d193779` | documento de engenharia de software | — |
| 03/09 19:45 | `17f7e5f` | histórico de visitas por paciente | — |
| 16/09 14:00 | `ef1f7e9` | READMEs reescritos com instruções de setup | — |

## 3. Alterações NÃO commitadas ligadas às falhas de 29/10
O Git não atribui alterações a casos de teste. O mapeamento abaixo **vem do trabalho feito na sessão de 29/10** (cada arquivo foi editado para corrigir o caso indicado) e deve ser lido como tal, não como prova do Git.

| Caso (falha de 29/10) | Arquivos tocados (todos não commitados) | Mudança |
|---|---|---|
| **F02** cadastro vazio sem aviso, texto "todos opcionais" | `HealthHub-Project/src/components/Buttons/index.tsx`; `HealthHub-Project/src/pages/MobileTriage/index.tsx`; `HealthHub-Project/src/components/ui/AvisoErro.tsx` (novo); `HealthHub-Project/src/utils/erro.ts` (+ `erro.spec.ts`, novos); `HealthHub-BackEnd/src/modules/patients/presentation/dtos/create-patient.dto.ts` | aviso visível com a mensagem do backend; texto trocado para "Dados obrigatórios"; mensagens de validação em português |
| **F04** recusa de 46 °C sem aviso (aprovado na rodada 1, anotado como silencioso) | `HealthHub-Project/src/components/Buttons/ModalEditPatient.tsx`; `HealthHub-BackEnd/src/modules/sinais-vitais/presentation/dtos/create-sinais-vitais.dto.ts`; `erro.ts`, `AvisoErro.tsx` | mensagem da recusa exibida |
| **F08** bloqueio sem sinais sem mensagem | `HealthHub-Project/src/pages/Alerts/index.tsx`; `MobileTriage/index.tsx`; `AvisoErro.tsx` | erros das ações da esteira exibidos (aviso fixo no rodapé na esteira desktop) |
| **F10** sem classificação à frente do Vermelho | `HealthHub-BackEnd/src/modules/fila/application/list-fila.service.ts` e `list-fila.service.spec.ts` (novo); `MobileTriage/index.tsx` (Laranja e Azul na ordenação) | sem classificação passa para depois dos classificados |
| **F13** botões que o backend recusa (403) | `HealthHub-Project/src/pages/Alerts/index.tsx`; `HealthHub-Project/src/pages/Patients/index.tsx`; `HealthHub-Project/src/components/CardPatient/index.tsx`; `MobileTriage/index.tsx` | "Editar", "Liberar Alta" e × só aparecem para quem o backend autoriza |
| **F17** senha do /mobile repetida | `HealthHub-Project/src/pages/MobileTriage/index.tsx`; `HealthHub-Project/src/context/CareContext.tsx` (`proximaSenha`) | senha = maior PR-NNN presente + 1, igual ao desktop |
| Não era caso da ficha | `HealthHub-BackEnd/src/main.ts` (`process.env.TZ = 'UTC'`); 5 erros de tipo antigos em `TermosUsoModal` e `ExportPDF` | horários deslocados em 3 h (esperas, chat, gráfico); `npm run build` passou a funcionar |

Resumo do diff dessas áreas (`git diff --stat`, só arquivos já rastreados): backend `fila/*`, `patients`, `sinais-vitais`, `main.ts` = 11 arquivos, 118 inserções e 30 remoções; frontend `Alerts`, `MobileTriage`, `Buttons`, `CardPatient`, `CareContext`, `Patients` = 9 arquivos, 589 inserções e 759 remoções (o redesign de 28/10 faz parte desses números).

Outras funcionalidades não commitadas e anteriores às correções (citadas no TCC): módulo `metricas`, alta com `PATCH /fila/:id/alta` (`discharge-fila.service.ts`), readmissão e migração `AddAtivoToPacientes`, `shared/realtime`, ordenação e bloqueios da classificação (`update-fila.service.ts`), testes `*.spec.ts`, redesign do frontend.

## 4. Registros de execução existentes
| Registro | Onde | Conteúdo verificável agora |
|---|---|---|
| Rodada 1 (antes das correções) | `HealthHub_Mono/evidencias_testes_2026-10-29/runner/resultados.json`, `prints/` (78 imagens), `RESUMO_EXECUCAO.md` | 22 casos: **17 APROVADO e 5 REPROVADO (F02, F08, F10, F13, F17)**; 29/10, 09:25 a 09:52 (horário de Brasília); versão: `ef1f7e9` + 96 alterações não commitadas |
| Execuções descartadas | `…/runner/execucoes_invalidas.json` | 11 registros descartados por falha da automação (não do sistema), com o motivo; 3 resultados da rodada 1 (F02, F16, C01) foram corrigidos manualmente após revisão dos prints e o original foi guardado nesse arquivo |
| Rodada 2 (depois das correções) | `C:\Users\642mi\Documents\HealthHub_Testes_Rodada2\` (`resultados.json`, `prints/` com 76 imagens, `RESUMO.md`, ficha `.xlsx`) | 22 casos: **22 APROVADO**; 29/10, 10:25 a 10:36; banco de teste novo; versão: `ef1f7e9` + 100 alterações não commitadas |
| Testes automatizados | `…/rodada2/relatorio_testes_*_pos_correcoes.txt` e cópias em `HealthHub_Testes_Rodada2` | backend 13/13, frontend 15/15 (antes das correções: 13/13 e 11/11) |

**Ressalvas honestas**
- As tentativas intermediárias da rodada 2 (que falharam por problemas da automação e foram refeitas) **não foram preservadas**; só a execução final está registrada.
- Os resultados são de **automação solo, em ambiente local, com dados fictícios**. Os tempos de C01–C05 são tempo de automação, não humano.
- A Parte 4 do roteiro (IA e áudio, I01–I03) não foi executada com a Groq.
- Não existe avaliação com enfermeiros, usuários ou orientador registrada no repositório ou nesses arquivos.

## 5. O que dá para afirmar e o que não
- **Dá para afirmar (com os registros acima):** houve uma execução que encontrou 5 reprovações; mudanças de código foram feitas na árvore de trabalho para tratá-las; uma segunda execução, na mesma versão suja corrigida, teve 22 de 22 aprovados.
- **Não dá para afirmar:** que as correções foram versionadas (não há commit), que houve ciclo DSR completo com avaliação, nem que o resultado vale para o commit `ef1f7e9` isolado (não foi testado).

## 6. Dúvida para o autor
Quer que eu proponha a divisão em commits (por assunto: correções F02–F17, métricas/readmissão, redesign, testes) e uma tag? Só commito com seu OK, sem `.env` e sem segredos (T1 do prompt).
