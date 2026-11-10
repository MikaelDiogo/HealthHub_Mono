# RESULTADOS PARA O TCC (5): rodada 4 (429 da IA, termo de uso e versão final única)

Tudo aqui foi feito com **dados fictícios**, **IA simulada** (nenhuma chamada real à Groq) e **banco de teste novo** (`healthhub_test_r4`, onze migrações). Linha de base: etiqueta `tcc-rodada-final-3-1` (`6ad4ff4`); etiqueta de restauração `pre-rodada4`; branch de trabalho `rodada4-429-termos`.

## 0. Versões
| Item | Valor |
|---|---|
| Commit X (só código e a documentação do próprio comportamento), **o testado** | `4714bb19534e0cc34825a8b9b0bf2082f462942a` |
| Commit Y (só evidências, `evidencias_tcc/`) | o commit que contém este arquivo; o hash completo está no `LEIAME.txt` do ZIP e na etiqueta `tcc-rodada-final-4` |
| Prova de código idêntico | `git diff --stat X Y -- . ':!evidencias_tcc' ':!docs'` deve sair **vazio** (a saída está no `LEIAME.txt`) |

Como o Y não pode conter o próprio hash, ele é informado fora do arquivo. O `DOCUMENTO_ENGENHARIA_SOFTWARE.md` (na raiz) entrou no **X**, junto com o código, para a prova de diff ficar vazia; este relatório fica dentro de `evidencias_tcc/`.

## 1. Linha de base (antes da mudança, em `6ad4ff4`)
| Item | Observado |
|---|---|
| 429 do provedor no chat | HTTP **500**, corpo `{"error":"Assistente clínico indisponível."}` (TF08 da rodada 3: `evidencias_tcc/rodada_final_3/verificacao_bruta/tf_resultados.json`) |
| Mensagem na tela | "Erro ao conectar com o assistente." (código de `Monitoring/index.tsx` na linha de base) |
| Áudio com 429 | HTTP 500 `{"error":"Falha ao transcrever o áudio."}` e a tela não mostrava nada (o `catch` era vazio) |
| Contagens | backend **254** testes, frontend **109** (relatório 4 da rodada 3) |

Esta linha de base vem das evidências já registradas na rodada 3 e do código da etiqueta; **não repeti a medição** em `6ad4ff4`.

## 2. O que mudou (arquivo, antes e depois)
| Arquivo | Antes | Depois |
|---|---|---|
| `HealthHub-BackEnd/src/modules/ai/infrastructure/limite-de-taxa.ts` (novo) | não existia | `LimiteDeTaxaException` (HTTP 429), `ehLimiteDeTaxa`, `erroDeLimite` (lê `retry-after` do provedor só se for número inteiro) e `LimiteDeTaxaFilter` (escreve o cabeçalho `Retry-After`) |
| `.../infrastructure/groq-chat.provider.ts` | todo erro virava 500 | 429 do provedor → `erroDeLimite`; o resto continua 500 genérico; 503 sem chave igual |
| `.../application/audio-transcription.service.ts` | todo erro virava 500 | idem para o áudio |
| `.../presentation/ai.controller.ts` | sem tratamento de 429 | `@UseFilters(LimiteDeTaxaFilter)` e `@ApiResponse(429)` (Swagger) no chat e no áudio |
| `HealthHub-Project/src/utils/aiErro.ts` (novo) | não existia | `mensagemDeErroDaIa` (429 com `message` → a `message`; senão "Erro ao conectar com o assistente.") e `ehLimiteDaIa` |
| `HealthHub-Project/src/pages/Monitoring/index.tsx` | chat: texto fixo; áudio: erro engolido | chat: `mensagemDeErroDaIa(err)`; áudio: só o 429 mostra a mensagem no chat, os outros erros continuam sem aviso, como antes |
| `DOCUMENTO_ENGENHARIA_SOFTWARE.md` | 429 só para o limite global | diagrama de sequência, tabelas de rotas e de erros, risco R-03 e nova seção 10.9.1 com o formato exato |

## 3. Formato exato da resposta 429
```
HTTP/1.1 429 Too Many Requests
Retry-After: 30            <- SÓ se o provedor mandou "retry-after" com número inteiro; senão o cabeçalho não existe
Content-Type: application/json

{"statusCode":429,"message":"O assistente de IA está com muitas solicitações no momento. Aguarde cerca de um minuto e tente novamente."}
```
Os outros erros mantêm o formato antigo: `500 {"error":"Assistente clínico indisponível."}` (chat), `500 {"error":"Falha ao transcrever o áudio."}` (áudio), `503 {"error":"... não configurado neste ambiente."}`. **Diferença de formato:** o 429 usa o campo `message` (como o pedido definiu) e os demais usam `error`.

## 4. Termo de uso e política: "data de nascimento"
**Divergência em relação ao pedido: não havia o que trocar.** A busca por "nascimento" (qualquer caixa) em `HealthHub-BackEnd/src` e `HealthHub-Project/src` dá **0 ocorrências**. Os textos já foram corrigidos na rodada 2 e dizem "idade":

| Onde | Texto atual (já correto) | Alteração nesta rodada |
|---|---|---|
| `TermosUsoModal/index.tsx:165` (modal de termos) | "Nome completo (único campo obrigatório) e, quando informados, CPF, RG, idade, sexo, endereço e telefone..." | nenhuma |
| `pages/PoliticaDados/index.tsx` | não cita data de nascimento (conferido pela busca e pelo teste novo) | nenhuma |
| `utils/gerarPDFPolitica.ts:142` (gerador do PDF) | "Nome completo (unico campo obrigatorio) e, quando informados, CPF, RG, idade, sexo..." | nenhuma |
| `DOCUMENTO_ENGENHARIA_SOFTWARE.md`, `README.md` | sem ocorrência | nenhuma |
| `evidencias_tcc/05_achados.md`, `06_modelo.md`, `10_permissoes.md` (histórico) | citam a divergência **encontrada antes**; são registro histórico | **não alterados** (evidência antiga) |
| `coleta_tcc/*` (pasta solta, não versionada) | notas de levantamento | não alterados |

**Verificação automática nova:** `HealthHub-Project/src/utils/textosLegais.spec.ts` lê os três arquivos de texto (modal, página, gerador do PDF) e falha se aparecer "nascimento"; também exige "idade" no modal e no gerador. **Limite honesto:** provei que o detector funciona com textos de exemplo (o teste inclui "CPF, RG, data de nascimento, sexo" → acusa), mas **não** editei os arquivos reais para vê-lo falhar. O PDF real gerado na captura (Figura 30) também foi conferido pelo script: o texto extraído do PDF não contém "nascimento" (a captura teria falhado).

## 5. Contagens de testes e builds
| | Linha de base | Depois (clone limpo de X) |
|---|---|---|
| Backend | 254 | **265** (23 arquivos) |
| Frontend | 109 | **119** (11 arquivos) |
| `nest build` / `vite build` / `tsc -b` | ok | ok |

Novos: backend +11 (chat +3: 429 sem `retry-after`, 429 com `retry-after`, `retry-after` em formato estranho descartado; áudio +2: 429 e 429 com `retry-after`; `ai-limite-http.spec.ts` +6: status, corpo exato e cabeçalho `Retry-After` presente/ausente, mais 500 genérico, para chat e áudio) e frontend +10 (`aiErro.spec.ts` 5; `textosLegais.spec.ts` 5).

### Testes antigos alterados
| Teste | Motivo | Novo esperado |
|---|---|---|
| `groq-chat.provider.spec.ts`, `it.each([[429,...],[500,...]])` | esperava que o 429 virasse 500 (`InternalServerErrorException`) | o 429 saiu desse caso (agora tem testes próprios, HTTP 429); ficam 500 e 400 como erros genéricos |
| TF08 (`tf/tf_casos.mjs`) | só checava "sem resposta clínica inventada" e deixava o texto "o 429 vira 500" | 9 checagens com esperados escritos à mão do pedido (ver 6) |

A mudança é a **pedida** (item 2 do pedido). Nenhum outro teste foi alterado.

## 6. Verificação em clone limpo de X (banco novo, onze migrações)
Ambiente: Windows 11, Node 24, PostgreSQL em contêiner (porta 5435, banco `healthhub_test_r4`), API com o simulador de IA. Os scripts de verificação atualizados (simulador, TF08 e `capturas_rodada4.mjs`) foram **copiados** para o clone, porque ficam no Y (evidências) e não no X.

| Verificação | Resultado |
|---|---|
| Onze migrações aplicadas e seed | 11 aplicadas; seed ok |
| Registro de eventos (API) | **14/14** |
| S1, S2, S3, S4, **S4-mensagem**, S4-médico, S5, S7 | **APROVADO**; S8 registrado (sem critério) |
| S6 (migração preserva dados, banco descartável) | **APROVADO** |
| TF01, TF02, TF03, TF04, **TF08**, TF09 | **APROVADO** |
| TF06, TF07 | documentado / observado, como antes (sem critério de aprovação) |
| TF05 (fronteiras de alerta) | **26/26** |
| Ida e volta no banco | **10/10** |
| Concorrência (20 repetições) | 0 senhas duplicadas, 0 entradas duplicadas, 0 respostas 5xx |
| `GET /health` | 200 `{"status":"ok","database":"up"}` |
| 22 cenários pela tela (F01–F17, C01–C05) + **F18** | **23 de 23 APROVADOS**, 0 reprovados |

### TF08: esperado e obtido (esperado escrito à mão a partir do pedido)
| Entrada (simulada) | Esperado | Obtido |
|---|---|---|
| chat, 429 sem `retry-after` | HTTP 429, corpo `{statusCode, message}` com a mensagem exata, sem `Retry-After` | confere |
| chat, 429 com `retry-after: 30` | HTTP 429, mesma mensagem, `Retry-After: 30` | confere |
| chat, 500 do provedor | HTTP 500 `{"error":"Assistente clínico indisponível."}`, sem corpo externo | confere |
| chat, timeout | HTTP 500 genérico | confere |
| áudio, 429 sem e com `retry-after` | HTTP 429, mesma mensagem, cabeçalho só no caso com `retry-after` | confere |
| áudio, outro erro do provedor | HTTP 500 `{"error":"Falha ao transcrever o áudio."}` | confere |
| qualquer erro | nenhuma resposta clínica inventada; sinais vitais antes = depois | confere |

## 7. Capturas (clone de X, 1280 × 800, tema claro, mesmo recorte das capturas correspondentes da rodada 2)
| Figura | Arquivo | O que mostra |
|---|---|---|
| 28 | `capturas/fig28_429_chat_r4.png` | Chat do Monitoramento com a mensagem do 429 (**provedor simulado**; rotular como simulada). A mensagem de teste aparece como "ERRO_429": é o gatilho do simulador |
| 29 | `capturas/fig29_termos_ia_r4.png` | Modal de termos, seção 6 (Uso da IA): nome, CPF, RG, telefone e endereço não são enviados |
| 30 | `capturas/fig30_politica_pdf_pag1_r4.png` | 1ª página do PDF da política gerado pelo app ("idade, sexo..."; sem data de nascimento) |

**Atenção na numeração:** no pedido da rodada 4, "Figura 30" é a 1ª página do PDF da política; na rodada 3 a "Figura 30" era o painel F14 (`fig30_painel_atencao_f14.png`). São figuras **diferentes**; use os nomes dos arquivos (sufixo `_r4`) para não confundir. As Figuras 28 e 29 não existem em rodadas anteriores no repositório; usei como "anteriores" as capturas equivalentes da rodada 2 (`novo08`, `novo03`, `novo10`). Cada PNG foi aberto e conferido: sem nome real, sem chave, sem barra de extensão. Manifesto: `capturas/figuras_manifesto.csv`.

## 8. Divergências e o que NÃO foi feito
1. "Data de nascimento" já estava corrigida (seção 4); o pedido estava desatualizado nesse ponto.
2. Numeração das figuras (seção 7).
3. Formato `message` (429) x `error` (demais erros): por decisão do pedido, não padronizei os outros.
4. **`Retry-After` real da Groq não foi observado**: só o simulador e os testes automáticos o enviam. Não sei se a Groq manda esse cabeçalho no 429 (se não mandar, o sistema simplesmente não o repassa).
5. O 429 do **áudio na tela** não foi capturado nem testado pela tela: está testado na API (TF08) e no utilitário de mensagem (teste do frontend); o componente em si não tem teste de renderização.
6. Não rodei de novo o `tf08_ui.mjs` (o que a tela mostra em 500/vazio). A tela do 429 está na Figura 28.
7. Não repeti o desempenho (A/B): a mudança só atua no caminho de erro da IA.
8. Linha de base do 429 antigo vem das evidências da rodada 3, não de nova medição em `6ad4ff4`.
9. Desempenho, preço de hospedagem e confirmação do orientador sobre os limiares: pendências das rodadas anteriores, inalteradas.
