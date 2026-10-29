# LEIAME — Pacote de evidências técnicas do HealthHub (entrega de 29/10/2026)

Este ZIP é autossuficiente: tudo o que os relatórios citam está dentro dele. Ambiente: Windows 11, Node 24.20.0, banco de teste isolado (Postgres, porta 5435), **dados 100% fictícios** e **provedor de IA simulado** (nenhuma chamada à Groq). Versão: commit `70190bf` (tag `tcc-2026-10-29`) **mais** as mudanças desta rodada, **não commitadas** (`evidencias_tcc/mudancas_desta_rodada.patch`, 23 arquivos).

## 1. Feito e comprovado
| O quê | Prova | Onde |
|---|---|---|
| Só o médico dá alta também pelo `PUT /fila/:id` (A1) | teste que falhava e passa | `10_permissoes.md`, `logs/permissoes_*` |
| Registro de sinais vitais vazio é recusado (A2) | idem | idem |
| `status` e `gravidade` só aceitam os valores que o sistema já usa (A3); sem mapa de transições | idem | idem |
| IA/áudio: contexto nulo não dá 500; `message` ausente e áudio de 0 byte dão 400; erro do provedor não devolve o corpo bruto; 503 não cita `.env` (A4) | testes unitários e casos no mock, antes × depois | `10_permissoes.md` seção 3, `logs/casos_ia_audio_*` |
| `PATCH patients/:id/visitas/fechar` só médico (B1a) | teste de metadados da rota | `10_permissoes.md` seção 4 |
| Suítes: backend **84/84** (antes 13), frontend **15/15**; `npm ci` + build com código 0 em cópia limpa | logs brutos | `logs/permissoes_regressao_*.log` |
| Medição da concorrência na admissão (B4): mesma senha aceita em duas admissões simultâneas; 8 admissões simultâneas do mesmo paciente deixaram 2 entradas na fila | script e saída | `mock/b4_concorrencia.mjs`, `logs/b4_concorrencia.json` |
| Relatórios 01 a 09 (versão, build, testes, IA/áudio, achados, modelo, custos, benchmark, histórico) | ver cada arquivo | `01_*.md` … `09_*.md` |

**Comprovado só por leitura/busca (não por execução que falhe e passe):** textos de Termos, Política e PDF (A5); README de Node (A6); `|| undefined` no cadastro desktop.

## 2. Não feito / não medido
- **Cobertura de código:** não medida (falta `@vitest/coverage-v8`; não instalei).
- **Node 20 e 22:** não testados; só 24.20.0. O piso 22.12 vem do `engines` do Vitest 5. Não acrescentei `engines` aos `package.json` (não aprovado).
- **Testes de A1–A3 via HTTP e banco real:** não feitos (testes unitários com repositórios simulados).
- **Tela dos textos do A5:** não renderizada nem o PDF aberto nesta rodada.
- **Tokens, custo em moeda, duração de áudio:** não medidos (o app não registra tokens).
- **Respostas da Groq real:** não existem aqui; toda resposta de IA/áudio é simulada e está rotulada assim.
- **Decisões de acesso ainda em aberto, sem implementação:** B1b (`GET visitas`), B2 (dado clínico para a recepção), B3 (remover da esteira sem encerrar a visita), correção do B4 (senha no backend + `UNIQUE`, exige migration).
- **Não commitado:** nada desta rodada foi commitado nem tagueado.

## 3. Pendências externas (humano, orientador ou instituição)
Ensaio de uso com tempo e usabilidade com pessoas; ciclos DSR e avaliação com usuários; validação clínica de regras, limiares e hipóteses da IA; licença e autorização do Protocolo de Manchester (GBCR); base legal da LGPD, contratos e ética institucional; escolha do modelo de IA; benchmark com chamadas reais (e confirmação dos direitos das vinhetas); planos e preços da Groq (URL oficial e data); decisão do orientador sobre mudanças de modelo de dados.

## 4. Conteúdo
```
LEIAME.md                      este arquivo
evidencias_tcc/
  01_versao.md … 10_permissoes.md   relatórios
  mudancas_desta_rodada.patch       diff revisado, só desta rodada (sem segredos)
  logs/                             saídas brutas (antes, depois, build, testes, git, mock)
  mock/                             provedor simulado e scripts dos casos (IA, áudio, B4)
anexos_sessoes_anteriores/
  testes_funcionais_29-10/          resumo, ficha preenchida, resultados e relatórios da verificação funcional (22/22)
```
Os 76 prints e PDFs da verificação funcional **não** estão neste pacote (só o resumo e a ficha); ficam na pasta `HealthHub_Testes_Rodada2` do computador do autor.

## 5. Segurança deste pacote
Varredura automática nos arquivos de texto: nenhum `.env`, chave, hash de senha, e-mail de seed ou token. A "chave" que aparece nos testes e no mock é a string de mentira `CHAVE-SIMULADA-NAO-REAL`. O backup completo do estado anterior ficou **fora** do ZIP, em pasta privada do autor.
