# 02 — Build e execução reproduzíveis (T2)

Coleta em 29/10/2026. Logs completos: `logs/build_backend.log` e `logs/build_frontend.log`.

## 1. Procedimento
1. Cópia limpa em `%TEMP%\hh_clean` com `git ls-files -co --exclude-standard` (rastreados + novos não ignorados): **sem** `.env`, `node_modules` ou `dist`. Só `HealthHub-BackEnd/.env.example` veio junto.
2. `npm ci` (instala exatamente o `package-lock.json`) e `npm run build` em cada pacote.
3. Ambiente: **Node v24.20.0, npm 11.19.0**, Windows 11.

## 2. Resultado
| Pacote | `npm ci` | `npm run build` | Detalhe |
|---|---|---|---|
| Backend (`healthhub-backend@2.0.0`) | **sucesso** (519 pacotes, ~1 min; código 0) | **sucesso** (código 0; `nest build` gerou `dist/`) | 8 avisos de pacote obsoleto (`uuid@9`, `glob@10`), sem erro |
| Frontend (`healthhub@0.0.0`) | **sucesso** (395 pacotes, ~1 min; código 0) | **sucesso** (código 0; Vite: "built in 37,93 s"; `tsc` sem erros) | 6 avisos |

**Sobre o erro de build de TypeScript que o TCC cita:** na árvore **atual** o build do frontend **passa**. A causa era de 5 erros `TS6133` (variável/import declarado e nunca usado) em `TermosUsoModal` (`useNavigate`, `useAuth`) e `ExportPDF` (`white` duas vezes e `pageH`), que o `tsc -b` do `npm run build` tratava como erro. Foram removidos em 29/10 (alteração ainda **não commitada**). **No commit `ef1f7e9` o build do frontend falha** pelos mesmos erros (dado de 28–29/10; não refeito aqui, porque exigiria checkout limpo do commit). O backend também passou antes, sem erros.

## 3. Versões (reais, lidas agora)
| Item | Valor |
|---|---|
| `package.json` backend | `healthhub-backend@2.0.0`; 23 dependências, 9 de desenvolvimento; `lockfileVersion` 3 |
| `package.json` frontend | `healthhub@0.0.0`; 14 dependências, 13 de desenvolvimento; `lockfileVersion` 3 |
| Resolvidas (lockfile) | Nest `@nestjs/core` 10.4.22 · TypeORM 0.3.31 · socket.io 4.8.3 · axios 1.20.0 (backend) / 1.13.4 (frontend) · TypeScript 5.9.3 · tsx 4.23.12 · React 19.2.4 · Mantine 8.3.14 · Vite 7.3.1 (frontend) · Vitest 5.0.4 (ambos) |
| Campo `engines` | **não existe** em nenhum `package.json` |

## 4. Versão mínima de Node que realmente funciona
- O README diz **Node 20 LTS**. A única versão **testada** foi a **24.20.0**. **Não medido** em Node 20 ou 22 (não há outra versão instalada; não instalei nenhuma).
- O que as dependências exigem (campo `engines` de cada pacote instalado):
  - **Vitest 5.0.4** (`npm test` nos dois pacotes): `^22.12.0 || ^24.0.0 || >=26.0.0`. **Node 20 não atende**; portanto os testes não são garantidos em Node 20, apesar do README.
  - **Vite 7.3.1** (build do frontend): `^20.19.0 || >=22.12.0`. Node 20 só a partir de **20.19**.
  - Nest 10, TypeORM, TypeScript, tsx: faixas bem mais amplas (Node ≥ 16–18).
- **Conclusão apoiada em evidência:** para **build + testes** o piso é **Node 22.12**; para só **build**, o piso declarado é 20.19. Recomendação (você decide): atualizar o README para "Node 22.12+ (testado em 24.20.0)" e, se quiser, acrescentar `engines` aos `package.json`.

## 5. Scripts `.mjs` do pacote `HealthHub_Testes_Rodada2/scripts`: o que impede rodarem só com o repositório
Confirmado em `lib.mjs` (e os demais só importam `./lib.mjs`):
| Problema | Onde | Ajuste proposto (**não aplicado**) |
|---|---|---|
| Caminho absoluto para um cliente CDP de terceiros dentro de `.agents/skills/design-taste-frontend/…/cdp.mjs` (ferramenta da sessão, fora do código do sistema) | `lib.mjs:5` | Trocar por uma dependência declarada (`playwright-core` ou `puppeteer-core` em `devDependencies` de uma pasta `e2e/`), ou copiar o cliente CDP para o repositório com a licença. Hoje o repositório **não** traz essa dependência |
| Caminho padrão de evidências no disco do autor | `lib.mjs:10-11` | Tornar `EV_DIR` obrigatório ou relativo (`./saida`) |
| Credenciais lidas de variáveis `SEED_*` e banco/porta definidos num `testenv.sh` que **não está no pacote** | `lib.mjs:15-19` | Documentar as variáveis (já existem em `.env.example`) e incluir um `run.sh`/`run.ps1` que sobe o Postgres isolado (porta 5435), roda migrations e seed e executa os scripts em ordem |
| Navegador (Edge/Chrome) e `pdftotext` (poppler) são pré-requisitos externos | `lib.mjs` e `f16_f17.mjs` | Listar nos pré-requisitos; ou validar o PDF com uma biblioteca npm |
| Os casos dependem da **ordem** (cada script parte do estado deixado pelo anterior) | todos | Documentar a ordem `f01 → f02_f06 → f03_f06 → f07_f09 → f10 → f11_f12 → f13 → f14 → f15 → f16_f17 → c01_c05` e exigir banco novo e vazio |
| Porta do frontend `5173` e CORS: o backend só aceita a origem `localhost:5173` | `lib.mjs` (`WEB`) | Parametrizar por variável (`WEB_URL`) |

**Observação para o TCC:** os scripts reproduzem a verificação **neste computador**, com as ferramentas desta sessão. Para a banca, o caminho honesto é citar a ficha e o `RESUMO.md` como evidência e dizer que a automação é auxiliar, não um pacote de testes pronto para clonar e rodar.
