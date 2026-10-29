# 01 — Versão do código (T1)

Coleta em 29/10/2026, só leitura. **Nada foi commitado.** Saída bruta: `logs/git_estado.txt`.

## 1. Estado atual
| Item | Valor |
|---|---|
| Branch | `master` (acompanha `origin/master`) |
| HEAD | `ef1f7e9f26a8e19f475fb056b1839b4b1f75e172` — "docs: reescreve READMEs com instrucoes completas de setup" (16/09/2026) |
| Últimos 5 commits | `ef1f7e9`, `17f7e5f` (histórico de visitas), `d193779` (documento de engenharia), `ca4475f` (participantes do grupo no chat), `0faea48` (campo de escrita do chat) |
| `git status -s` | **100 entradas**: 58 modificadas, 7 apagadas, 35 não rastreadas |
| `git diff --stat` (só rastreados) | 65 arquivos, +3559 / −2364 |

**Diferença em relação ao texto do TCC:** o TCC cita "92 alterações" (contagem de 28/10). Hoje são **100**, porque em 29/10 foram acrescentadas as correções de avisos de erro, ordenação, permissões por perfil, senha do /mobile e mensagens de validação, além das pastas de evidência. A contagem muda a cada arquivo novo; cite sempre o hash e diga "versão com alterações não commitadas".

## 2. Alterações por área (rastreadas)
**Backend (24 arquivos modificados)**
- Fila/esteira: `fila/application/{create,delete,list,update}-fila.service.ts`, `fila.module.ts`, `fila.controller.ts` (ordenação, bloqueio de classificação, readmissão, alta).
- Pacientes: `paciente.entity.ts` (campo `ativo`), repositório, `list-patients.service.ts`, `patients.controller.ts`, `create-patient.dto.ts` (mensagens em português).
- Sinais vitais: `create-sinais-vitais.dto.ts` (mensagens em português), `sinais-vitais.module.ts`.
- IA: `ai.module.ts`, `clinical-chat.service.ts` (provedor movido para `ai/infrastructure`).
- Chat: serviço, interface e repositório TypeORM.
- Infra: `main.ts` (processo em UTC), `app.module.ts`, `data-source.ts`, `package.json`/`package-lock.json` (+ `vitest`, scripts `test` e `seed:demo-patients`).

**Frontend (7 apagados + 31 modificados)**
- Redesign (tema, tokens, layouts, sidebar, cartões, painel, pacientes, login, chat) e remoção de 7 `styles.css` do Tailwind.
- Funcionalidades: painel de métricas, readmissão, avisos de erro, botões por perfil, senha do /mobile, correção de tipos que impedia o build.
- `package.json`/`package-lock.json` (+ `vitest`, script `test`), `vite.config.ts`, `index.html`.

**Raiz:** `.gitignore` (+ `.taste-skill/`).

## 3. Arquivos não rastreados
**Código novo (35 arquivos que o TCC descreve — devem entrar):**
- Backend: migração `1783100000000-AddAtivoToPacientes.ts`; `discharge-fila.service.ts`; módulo `metricas/` (6 arquivos); `shared/realtime/` (2); `ai/domain/ai-chat-provider.interface.ts` e `ai/infrastructure/groq-chat.provider.ts`; `list-fila.service.spec.ts`, `update-fila.service.spec.ts`, `vitest.config.mts`; `seed-demo-patients.ts` (pacientes fictícios).
- Frontend: `components/AdmitirModal`, `components/ui/*` (6), `hooks/{useCountUp,useMetricas}.ts`, `pages/Dashboard/Blocos.tsx`, `services/metricas.ts` (+ spec), `utils/{aiResponse,datetime,erro,roles,vitalStatus}` (+ specs), `DESIGN.md`, `public/favicon.svg`.

**Não são código do sistema (decidir antes de commitar):**
| Caminho | Observação |
|---|---|
| `.agents/`, `.claude/`, `skills-lock.json` | ferramentas/skills instaladas na sessão; **não** versionar |
| `HealthHub-Project/src/assets/48360407-….png` | imagem de referência de **outro** sistema (aparece gente); **não** versionar |
| `eval/` (benchmark) | `eval/.env` é ignorado pelo `.gitignore` (confirmado). **`eval/vinhetas.csv`** tem direitos de redistribuição **não confirmados** (Levine et al.): não versionar sem confirmar |
| `Teste_Bench.md` | relatório do benchmark; decisão sua |
| `coleta_tcc/`, `Print_healthhub/`, `evidencias_testes_2026-10-29/`, `evidencias_tcc/` | documentação/evidências geradas em sessão; decisão sua (conferir antes de publicar) |

## 4. Verificações de segurança antes de qualquer commit
- Nenhum `.env`, chave ou segredo aparece em `git status` (varredura de nomes: `.env|secret|.key|.pem` → nenhum). `.env` e `eval/.env` estão no `.gitignore`.
- O nome real do autor aparece em `HealthHub-BackEnd/src/database/seed.ts:22` (`nome: 'Mikael Diogo'`, usuário de enfermagem do seed) e em um comentário que escrevi em `HealthHub-Project/src/pages/Dashboard/Blocos.tsx` (exemplo de abreviação de nome). Já são/serão dado pessoal no repositório. **Proposta (precisa do seu OK):** trocar por nomes fictícios nos dois.
- `.gitignore` ignora `*.log` e `logs/`: a pasta `evidencias_tcc/logs/` **não** entra em commit por padrão.

## 5. Proposta de commits (para você aprovar; nada foi feito)
Sugiro 3 commits, sem `git add -A`, escolhendo os arquivos por caminho:

1. **`feat(backend): readmissão, alta, métricas, tempo real e validações em português`**
   Todos os arquivos de `HealthHub-BackEnd/` listados nas seções 2 e 3 (inclui os specs e a migração).
2. **`feat(frontend): redesign, painel de métricas, readmissão e avisos de erro`**
   Todos os arquivos de `HealthHub-Project/` das seções 2 e 3, **exceto** `src/assets/48360407-….png`; mais `.gitignore`.
3. **`docs: evidências de teste e do TCC`** (opcional, só se você quiser versionar): `evidencias_tcc/*.md`, `HealthHub_Testes_Rodada2/` (fora do repositório hoje, em `Documentos`).

**Tag sugerida:** `tcc-2026-10-29` (anotada), apontando para o commit 2 (ou 3).

Antes de commitar eu rodaria `npm test` e o build dos dois pacotes de novo e `git diff --cached --stat` para você conferir a lista. **Aguardando seu OK** (e a resposta sobre o `seed.ts` e a imagem de referência).
