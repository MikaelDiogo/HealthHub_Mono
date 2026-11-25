> **SUBSTITUÍDO por `RESULTADOS_PARA_TCC_7.md` (versão final X2, COMPLETA).** Este arquivo é o histórico da tentativa anterior (X, INCOMPLETA), mantido sem alteração do conteúdo.

# RESULTADOS PARA O TCC (6): rodada 5 (conferência dos códigos CID na tabela oficial do DATASUS)

**Estado:** a parte de código, tabela, testes e verificação em clone limpo está **completa e aprovada**. **Dois itens do pedido NÃO foram atendidos como escritos**, por causa do comportamento real do modelo (seção 8): o modelo não escreveu a linha `CID-10:` em nenhuma das 3 chamadas reais, então a **Figura 26 não mostra o bloco de conferência**. Por isso o pacote está marcado INCOMPLETO nesse ponto.

Tudo foi feito com dados fictícios. Groq real: **3 chamadas** (o máximo permitido), só no passo 6.4. O resto usou o provedor simulado.

## 0. Versões
| Item | Valor |
|---|---|
| Linha de base | etiqueta `tcc-rodada-final-4` (`7046ecdd7fa83830f6069554cc3f36a228930498`); restauração: etiqueta `pre-rodada5` |
| Commit X (código, tabela, README da fonte, testes, documentação), **o testado** | `01e9b18a346f82c04b76780a333ab8364c24ec02` |
| Commit Y (só `evidencias_tcc/`) | o commit que contém este arquivo (hash completo no `LEIAME.txt` do ZIP). **Existe só na minha máquina, na branch `rodada5-cid-datasus`** |
| Publicação | **NÃO publicado:** sem etiqueta `tcc-rodada-final-5`, sem merge em `evolucao-estrutura`, sem push. Motivo: o pedido manda não publicar se uma etapa falhar, e a Figura 26 com o bloco não pôde ser feita (seção 8). Publicar depende da sua decisão |

## 1. Linha de base (antes da mudança)
- **Onde o prompt é montado:** `HealthHub-BackEnd/src/modules/ai/infrastructure/groq-chat.provider.ts`, função `buildSystemPrompt`. A regra 6 dizia: "Sempre que possível forneça referências a diretrizes de prática e sugira o CID provável." (o modelo escrevia o CID em qualquer lugar da resposta, sem consultar tabela).
- **Formato da resposta do chat:** `{ reply: string, source: string }` (`source` = `"groq"`). O corpo enviado à Groq tem só `model`, `max_tokens: 1024` e `messages`.
- **Tela:** `pages/Monitoring/index.tsx` mostra a resposta com `ReactMarkdown`. Verificado por teste (seção 6) que a lista do bloco novo mantém as quebras de linha: **o frontend não precisou mudar**.
- **Contagens:** backend **265** testes (23 arquivos); frontend **119** (11 arquivos).

## 2. Mudanças (arquivos e funções)
| Arquivo | O que mudou |
|---|---|
| `HealthHub-BackEnd/src/modules/ai/data/cid10/CID-10-SUBCATEGORIAS.CSV` e `CID-10-CATEGORIAS.CSV` (novos) | tabela oficial do DATASUS, sem alterar bytes (SHA-256 abaixo) |
| `.../data/cid10/README.md` (novo) | fonte, versão, datas, SHA-256 de cada arquivo e do ZIP, contagens, limites |
| `.gitattributes` (novo) | os `*.CSV` da pasta são binários (o Git não converte fim de linha) |
| `HealthHub-BackEnd/.gitignore` | **exceção** `!src/modules/ai/data/`: a regra `data/` ignorava a pasta e a tabela não entraria no commit |
| `HealthHub-BackEnd/nest-cli.json` | `assets`: copia `modules/ai/data/cid10/*.CSV` para `dist/` |
| `.../application/cid10.service.ts` (novo) | `Cid10Service`: carga única dos dois CSV (ISO-8859-1), `conferir()`, `estatisticas()` |
| `.../application/cid10-extracao.ts` (novo) | `extrairCodigos`, `mencionaCid`, `blocoDeConferencia`, `anexarConferencia`, `removerConferencia` |
| `.../application/clinical-chat.service.ts` | `execute` agora anexa o bloco à resposta do provedor; tira o bloco do histórico antes de reenviar à Groq; se a tabela falhar, devolve a resposta sem o bloco (log no servidor) |
| `.../ai.module.ts` | registra `Cid10Service` |
| `.../infrastructure/groq-chat.provider.ts` | **só a regra 6 do prompt** (seção 5) |
| `.../presentation/ai.controller.ts` | texto do Swagger do chat cita o bloco |
| `HealthHub-BackEnd/scripts/verificar-build-cid10.mjs` (novo) | prova do build (seção 6) |
| `DOCUMENTO_ENGENHARIA_SOFTWARE.md` | nova seção 10.10 |
| 4 arquivos de teste novos no backend e 1 no frontend | seção 6 |

**Não alterei:** cadastro, permissões, limiares, fila, migrações, seed, termos de uso, política de dados, o frontend (só um teste novo) nem o prompt do benchmark. `max_tokens`, timeout e o tratamento dos erros 429, 500 e 503 ficaram como na etiqueta `tcc-rodada-final-4` (os testes de erro antigos passaram sem alteração).

## 3. A tabela (SHA-256 e contagens)
Conferência feita de novo por mim (o pedido pedia confrontar, não confiar):
| Item | Valor |
|---|---|
| `CID10CSV.zip` fornecido | 306.066 bytes, SHA-256 `84f23809275575f751255048064bbb244b0de33fd5987ab98df0f98e5f5d2c95` (**confere** com o pedido) |
| `CID-10-SUBCATEGORIAS.CSV` | `HealthHub-BackEnd/src/modules/ai/data/cid10/`; SHA-256 `1a85bef8f2065ad3e95ab07b6441e6f03404c54ab35849ebd4edccc3ba234e60`; **12.451** linhas de dados (12.188 com 4 caracteres e 263 com 3), 0 códigos repetidos |
| `CID-10-CATEGORIAS.CSV` | mesma pasta; SHA-256 `e372033b1c04f321a9a98aac8534f2bd4f22aa40c622525b619a2f616a3b6fc8`; **2.045** linhas de dados |
| Bytes no Git | o SHA-256 do conteúdo no índice do Git é idêntico ao da origem (conferido antes do commit) |
| Estrutura | cabeçalhos, CRLF e separador `;` **conferem** com o pedido; **nenhuma divergência** nos números |
| Carga (build `dist/`, 3 medições) | **13 a 28 ms**; heap **+4,5 MiB** (RSS +17 a +25 MiB); 1.550.284 bytes lidos |

**Versão 2008:** `U07` e `U07.1` (COVID-19) **não constam** (verificado no CSV: ausentes nos dois arquivos). Confirma a previsão do pedido. **Licença/atribuição:** o trecho exato da página do DATASUS **não conferido** (a página não abriu a partir do ambiente: conexão recusada); o README da fonte diz isso e deixa a transcrição como pendência sua.

**Observação sobre o exemplo do pedido:** `X123` no bloco de exemplo é só ilustração de formato: `X123` **existe** na tabela (é uma subcategoria de causas externas). Nos testes, os códigos "que não constam" são `E999` e `I999`, ambos **confirmados ausentes** no CSV.

## 4. Regras exatas de extração e texto do bloco
**Extração (`cid10-extracao.ts`):**
1. Só considera linhas que contêm a **palavra** `CID` (palavra inteira, qualquer caixa; "decidir", "incidência", "Hepatotoxicidade" não contam).
2. Nelas, aceita **uma letra maiúscula + 2 dígitos + (opcional) ponto e 1 dígito** (`I10`, `E11.9`), sem letra ou dígito colado antes ou depois e sem mais dígitos após o ponto.
3. Apaga antes os **intervalos** sem espaço ao redor do traço (`T36-T50`, `I10–I15`).
4. Descarta o candidato logo depois da palavra **vitamina**/`vit.` (`vitamina B12`). `A4` e `T4` não têm dois dígitos e nunca casam.
5. Não extrai: `CID10`, `COVID19` (colados), `E119` (4 caracteres sem ponto), `I21.90`, minúsculas (`i10`). Sem repetir, na ordem do texto, normalizado **sem ponto**.

**Texto exato do bloco** (acrescentado ao fim da resposta, depois de **uma linha em branco**; o texto do modelo fica intacto, também em resposta truncada):
```
Conferência na CID-10 (DATASUS, versão 2008):
- I10 – <descrição oficial>: consta na tabela.
- I21 – <descrição oficial>: consta como categoria (sem o quarto caractere).
- X123 – não consta na tabela CID-10 do DATASUS (versão 2008).
```
Se a resposta cita CID mas nenhum código é identificado: `Conferência na CID-10 (DATASUS, versão 2008): nenhum código identificado na resposta.` Se não cita CID: nada é acrescentado. Os códigos aparecem sem ponto, como no exemplo do pedido. A conferência é só local: nada da tabela vai à Groq (o bloco de respostas anteriores é removido do histórico antes de reenviar).

## 5. Prompt: antes e depois (diff de `groq-chat.provider.ts`)
```diff
-6. Sempre que possível forneça referências a diretrizes de prática e sugira o CID provável.
+6. Sempre que possível forneça referências a diretrizes de prática. Logo após as hipóteses diagnósticas (e não no fim da resposta), escreva uma linha começando por "CID-10:" com os códigos prováveis da CID-10 (versão brasileira do DATASUS), no formato código – descrição, separados por ponto e vírgula.
```
O resto do prompt não mudou. O prompt do benchmark não foi tocado.

## 6. Testes
**Contagens:** backend **265 → 319** (+54; 27 arquivos); frontend **119 → 122** (+3; 12 arquivos). Builds do backend e do frontend e `tsc` ok. **Testes antigos alterados: nenhum** (os 265 antigos passaram sem mudança, inclusive os de erro 429/500/503).

| Arquivo novo | Testes | O que cobre |
|---|---|---|
| `cid10.service.spec.ts` | 17 | carga (contagens lidas do CSV pelo próprio teste); `I10`, `E119`, `J189`, `R509` com a descrição igual à do CSV; `I21` e `G40` como categoria; `E999`, `I999`, `U07`, `U07.1` não constam; normalização `i21.9`/`I219`/`I21.9` |
| `cid10-extracao.spec.ts` | 26 | extrações corretas; falsos positivos (`vitamina B12`, `papel A4`, `T4 livre`, intervalos, `CID10`, `COVID19`); texto exato do bloco; resposta sem CID, só CID, truncada |
| `clinical-chat-cid.spec.ts` | 9 | fluxo com provedor simulado: código válido + inválido (descrição oficial e aviso), sem CID não muda, texto original intacto, nada da tabela vai ao provedor, falha da tabela não quebra o chat, **erros 429, 500 e 503 inalterados** |
| `cid10-assets.spec.ts` | 2 | `nest-cli.json` copia os CSV; SHA-256 dos CSV conferem com o README |
| `HealthHub-Project/src/utils/blocoConferenciaCid.spec.ts` | 3 | a tela (`ReactMarkdown`) mantém cabeçalho + 3 itens de lista |

**Build real:** `npm run build` + `node scripts/verificar-build-cid10.mjs` (executado de outra pasta de trabalho): os dois CSV estão em `dist/` com os mesmos bytes; o serviço **compilado** carrega 12.451 + 2.045 e confere `I10` (subcategoria), `I21` (categoria) e `U07.1` (não consta). **APROVADO**, no repositório de trabalho e no clone de X.

## 7. Verificação em clone limpo de X (banco novo, onze migrações)
Ambiente: Windows 11, Node 24, PostgreSQL em contêiner (porta 5435, banco `healthhub_test_r5`), clone novo de X. Os esperados de cada caso estão escritos nos próprios scripts (versionados em `evidencias_tcc/scripts_verificacao/`), a partir dos pedidos das rodadas anteriores, não calculados pelo código testado. O TF08 usou o esperado do pedido da rodada 4 (429 com mensagem própria).

| Verificação | Resultado |
|---|---|
| Onze migrações e seed | 11 aplicadas |
| Builds, testes e varredura de segredos no clone | backend 319 e frontend 122 passam; builds ok; varredura 0 achados |
| Registro de eventos (API) | **14/14** |
| S1, S2, S3, S4, S4-mensagem, S4-médico, S5, S7 | **APROVADO**; S8 registrado (sem critério) |
| S6 (migração preserva dados) | **APROVADO** |
| TF01, TF02, TF03, TF04, TF08, TF09 | **APROVADO** (TF06 documentado e TF07 observado, como antes) |
| TF05 (fronteiras dos alertas) | **26/26** |
| Ida e volta no banco | **10/10** |
| Concorrência (20 repetições) | 0 senhas duplicadas, 0 entradas duplicadas, 0 respostas 5xx |
| `GET /health` | 200 `{"status":"ok","database":"up"}` |
| 22 cenários pela tela (F01–F17, C01–C05) + F18 | **23 de 23 APROVADOS**, 0 reprovados, 0 quebras de automação |

## 8. Chamadas reais à Groq (passo 6.4) e Figura 26
Paciente fictício FICTÍCIO-06 (mulher, 40 anos, dipirona como alergia, dor lombar), **mesma pergunta** da captura original (`novo04_chat_ia_cid.png`, rodada 2): "Quais os diagnósticos diferenciais mais prováveis, os sinais de alerta a pesquisar e a conduta inicial? Sugira o CID provável." Prompt novo. Chave só no processo da API, nunca impressa. Registro bruto em `capturas/registro_groq.jsonl` e `capturas/chamadas_reais.json`.

| Chamada | Como | HTTP | `finish_reason` | tokens gerados (raciocínio) | Texto do modelo | Escreveu a linha `CID-10:`? | Códigos extraídos | Conferência |
|---|---|---|---|---|---|---|---|---|
| 1 | pela tela (Figura 26) | 200 | `length` | 1.024 (507) | 1.931 caracteres | **não** | nenhum | nenhum bloco (a resposta não cita CID) |
| 2 | API, mesmo corpo da tela | 200 | `length` | 1.024 (512) | 1.758 caracteres | **não** | nenhum | idem |
| 3 | API, mesmo corpo da tela | 200 | `length` | 1.024 (868) | 623 caracteres | **não** | nenhum | idem |

**Resultado:** nas 3 chamadas a resposta foi **cortada pelo limite de 1.024 tokens** (parte dele gasta pelo raciocínio do modelo) ainda dentro da tabela de hipóteses, **antes** de chegar a qualquer código CID. O modelo escreveu uma tabela de diagnósticos e nenhuma linha `CID-10:`, apesar do pedido de colocá-la logo após as hipóteses. Conforme o pedido, **registrei e não tentei corrigir o prompt de novo**; não fiz mais chamadas.

**Consequência para a Figura 26:** `capturas/fig26_chat_ia_cid_conferencia_r5.png` mostra a resposta **real** com o prompt novo, **mas sem o bloco de conferência** (não há código para conferir). `fig26b_...` (fim da resposta) está no manifesto como **FALHA**: o bloco não existe nessa resposta, e eu não o forjei. O recorte é o mesmo da captura original (1280 × 800, topo do chat). **Item não atendido:** "Figura 26 com o bloco de conferência". O comportamento do bloco com um código válido e um inválido está provado pelos testes (seção 6), mas não por uma captura com a Groq real.

O que isso quer dizer para o TCC: o mecanismo de conferência funciona (testes e build), mas, com `max_tokens` 1.024 e este modelo, **não há garantia de que a IA chegue a escrever um CID**. Mexer em `max_tokens` ou no prompt estava fora do escopo.

## 9. Divergências e achados
1. **Figura 26 sem o bloco** e **modelo não escreveu a linha `CID-10:`** (seção 8).
2. **Achado de privacidade fora do escopo (não corrigido):** o registro da chamada real mostra que o **nome do paciente vai à Groq no histórico da conversa**: a tela envia como primeira mensagem do assistente "Olá! Analisando **<nome do paciente>**..." dentro de `history`, e o backend só limpa o `patientContext` (o histórico passa direto). No registro, a mensagem do assistente enviada à Groq **continha o nome** (fictício neste teste). Isso **contradiz o texto dos termos de uso** ("o nome ... não são enviados") e o documento de engenharia. Corrigir exige mudar o frontend ou filtrar o histórico: fora do escopo desta rodada, **decisão sua**.
3. **`.gitignore` do backend** ignorava `data/`: sem a exceção, a tabela não iria para o commit e o clone limpo falharia (corrigido e verificado).
4. **Extração** só reconhece o formato com ponto (`E11.9`), em maiúsculas; `E119` (sem ponto) e `i10` não são extraídos (regra conservadora do pedido). Um teste meu inicial usou `E999` sem ponto e falhou por isso; corrigi a **entrada do teste** (`E99.9`), não a regra.
5. O `X123` do exemplo do pedido **existe** na tabela.
6. **Licença do DATASUS:** trecho exato não conferido (seção 3).
7. O `LEIA-ME` do pedido sugere `git restore` dos 3 PDFs apagados em `evidencias_tcc/rodada_final_2/capturas/pdfs_gerados/`; **não restaurei** (fora do escopo e sem sua autorização); continuam apagados.
8. Os arquivos de ambiente de teste (em `/tmp`) tinham sumido; recriei o ambiente com valores só de teste, fora do repositório.
9. Não fiz a captura equivalente com o provedor **simulado** mostrando o bloco na tela (não foi pedida). Se quiser uma figura do bloco para o TCC, é possível (rotulada como simulada).
