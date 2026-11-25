# RESULTADOS PARA O TCC (7): rodada 5, continuação (CID com a IA real e nome fora do histórico)

**Estado: COMPLETO.** Todos os itens do pedido foram atendidos e todas as verificações passaram. Esta versão **substitui** a tentativa anterior (commit X, pacote INCOMPLETO, relatório `RESULTADOS_PARA_TCC_6.md`, que continua na pasta como histórico).

## 0. História e versões
| Item | Valor |
|---|---|
| Linha de base publicada | etiqueta `tcc-rodada-final-4` (`7046ecdd7fa83830f6069554cc3f36a228930498`) |
| Tentativa anterior (INCOMPLETA: Figura 26 sem bloco; nome ia à Groq no histórico) | X `01e9b18a346f82c04b76780a333ab8364c24ec02` e Y `cdf3bf4aae1f320fb75388619b02bfc0053b60fc`, **nunca publicados** |
| **Commit X2 (código, testes, README da fonte e documentação), o testado** | `d74513650791f3a502eef7988eb2043be84d71a6` |
| Commit Y2 (só `evidencias_tcc/`) | o commit que contém este arquivo; hash completo no `LEIAME.txt` do ZIP e na etiqueta `tcc-rodada-final-5` |
| Restauração dos 3 PDFs (autorizado no pedido) | feito: `git restore evidencias_tcc/rodada_final_2/capturas/pdfs_gerados/`. `git status` antes: 3 PDFs apagados (` D`); depois: nenhuma alteração rastreada |

Evidências anteriores (tentativa X) ficam em `verificacao_bruta/` e `capturas/`; as desta versão, em `verificacao_x2/` e `capturas_5b/`.

## 1. Nome do paciente fora do histórico (Passo 1)
**Frontend (origem):** `HealthHub-Project/src/utils/historicoChat.ts` (novo): `montarHistorico` descarta mensagens marcadas `local` e mantém as últimas 4 das demais. `pages/Monitoring/index.tsx`: a saudação "Olá! Analisando <nome>..." continua **na tela**, mas é criada com `local: true` e o `history` agora vem de `montarHistorico(messages)`.
**Backend (defesa):** `HealthHub-BackEnd/src/modules/ai/application/historico-seguro.ts` (novo), chamado em `clinical-chat.service.ts` antes de remover blocos de conferência:
- descarta do `history` as mensagens do **assistente** que casam com o padrão `Olá! Analisando ... Como posso ajudar neste caso?`;
- **se o cliente enviar o nome completo no `patientContext`** (`nome_completo` ou `nome`), descarta também qualquer mensagem do assistente que o contenha (sem diferenciar caixa e acentos);
- mensagens do **usuário** passam intactas ("o texto livre segue como foi digitado").
**Limite informado (como o pedido mandou):** a tela atual **não envia o nome** ao backend; então, hoje, só vale o **padrão da saudação**. Uma mensagem do assistente que traga o nome de outra forma passaria pelo filtro do backend (a defesa por nome só age se o cliente enviar o nome).
**Testes:** frontend `historicoChat.spec.ts` (4): a requisição não inclui a saudação. Backend `historico-seguro.spec.ts` (15) e 4 testes no fluxo do chat: histórico com a saudação e com o nome é filtrado; histórico normal passa intacto; o nome do `patientContext` não vai ao corpo do provedor.
**Verificação na chamada real (1.3c):** em **cada uma das 3 chamadas**, o registro bruto (`capturas_5b/registro_groq_5b.jsonl`) mostra que o pedido à Groq levou **só 2 mensagens** (`system` e `user`; **0** do assistente, histórico vazio) e **nenhuma continha o nome do paciente**. Resultado por chamada: **1 = não enviado; 2 = não enviado; 3 = não enviado** (nome fictício, não gravado no resultado).

## 2. CID com a IA real (Passo 2)
**2A (somente prompt) bastou. A etapa 2B NÃO foi acionada: `max_tokens` continua 1.024 (nenhuma linha alterada).** Diff de `groq-chat.provider.ts`, regra 6:
```diff
-6. Sempre que possível forneça referências a diretrizes de prática. Logo após as hipóteses diagnósticas (e não no fim da resposta), escreva uma linha começando por "CID-10:" com os códigos prováveis da CID-10 (versão brasileira do DATASUS), no formato código – descrição, separados por ponto e vírgula.
+6. Sempre que possível forneça referências a diretrizes de prática. A PRIMEIRA linha da sua resposta deve começar por "CID-10:" e trazer os códigos prováveis da CID-10 (versão brasileira do DATASUS) no formato código – descrição, separados por ponto e vírgula; só depois escreva o restante da resposta.
```
(O diff completo em relação à base `tcc-rodada-final-4` está em `codigo/`.) **Critério de sucesso (2 de 3): atingido com 3 de 3.**

## 3. Extração e formato do bloco (Passo 3)
1. Na linha que **começa por** `CID-10:` ou `CID:` (aceita `**CID-10:**` e o hífen não separável), o código de **4 caracteres sem ponto** (`E119`) também é aceito e normalizado. Nas demais linhas a regra conservadora continua (`E119` solto não é extraído).
2. No bloco, o código aparece no **formato oficial**: 3 caracteres sem ponto (`I10`) e 4 com ponto depois do terceiro (`E11.9`) (`formatarCodigoOficial`).
3. Texto do bloco, conferência local e regra de nada da tabela ir à Groq: **inalterados**. Formato final:
```
Conferência na CID-10 (DATASUS, versão 2008):
- I10 – <descrição oficial>: consta na tabela.
- I21 – <descrição oficial>: consta como categoria (sem o quarto caractere).
- X12.3 – não consta na tabela CID-10 do DATASUS (versão 2008).
```

## 4. Chamadas reais (Passo 4.1): paciente fictício FICTÍCIO-06, mesma pergunta, etapa 2A
Total de chamadas reais neste pedido: **3** (limite: 6; intervalo mínimo de 22 s, limite 20 s). Chave só no processo da API; nenhum segredo impresso ou gravado. Dados brutos: `capturas_5b/chamadas_reais_5b.json` e `registro_groq_5b.jsonl`.
| Chamada | Via | HTTP Groq | `finish_reason` | Tokens gerados (raciocínio) | Tempo total | Resposta do modelo | Linha `CID-10:` (posição) | Códigos extraídos (formato oficial) | Conferência | Bloco na resposta | Nome enviado à Groq? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | tela (Figura 26) | 200 | `length` | 1.024 (369) | 3,1 s | 2.181 caracteres | **sim, linha 1** | M54.5, M54.4 | os 2 constam | sim | **não** |
| 2 | API | 200 | `length` | 1.024 (475) | 2,5 s | 1.975 caracteres | **sim, linha 1** | M54.5, M51.2, S32.0, M54.4, M86.5 | os 5 constam | sim | **não** |
| 3 | API | 200 | `length` | 1.024 (338) | 2,4 s | 2.419 caracteres | **sim, linha 1** | M54.5, M51.9, M53.2, R10.2 | os 4 constam | sim | **não** |

Observações: (a) as 3 respostas **ainda foram cortadas** pelo limite de 1.024 tokens (`length`), mas agora **depois** da linha de CID, que vem primeiro; por isso o bloco existe. (b) O modelo escreve `**CID-10:**` com negrito; a extração trata isso (posição 1 nas 3). (c) Na chamada 2 o modelo escreveu também `M48.06` (5 caracteres, de outra classificação): a regra **não** o extraiu, como previsto (só aceita 3 ou 4 caracteres). (d) A descrição do bloco é a do **arquivo oficial** (ex.: "Lumbago com ciática"), não a do modelo ("Lumbago com ciatalgia"). (e) Amostra pequena (3 chamadas, 1 pergunta): não prova que o modelo sempre colocará o CID na primeira linha.

## 5. Figuras (recortes e manifesto)
Todas 1280 × 800, tema claro, 100%, PNG, paciente fictício. Manifestos: `capturas_5b/figuras_manifesto_5b.csv` e `figuras_manifesto_5b_simulado.csv`.
| Figura | Arquivo | Conteúdo | Recorte |
|---|---|---|---|
| **26** | `capturas_5b/fig26_chat_ia_cid_conferencia_r5b.png` | resposta **real** da Groq, topo: linha **`CID-10: M54.5 – Dor lombar baixa; M54.4 – Lumbago com ciatalgia`** | mesmo recorte da original (`novo04`, rodada 2) |
| **26b** | `capturas_5b/fig26b_chat_ia_cid_bloco_conferencia_r5b.png` | a mesma resposta, rolada ao **fim**: bloco "Conferência na CID-10 (DATASUS, versão 2008)" com as descrições oficiais | mesmo recorte 1280 × 800; muda só a rolagem do chat (o bloco fica no fim da resposta e não cabe junto com o topo) |
| **26c (SIMULADO)** | `capturas_5b/fig26c_bloco_simulado_r5b.png` | provedor **simulado** (nenhuma chamada real): bloco com **um código que consta (I10), uma categoria (I21) e um que não consta (U07.1)**, no formato oficial | rotulada **SIMULADO** no manifesto; conferido na tela: cabeçalho, I10, I21 e U07.1 |

A mensagem de teste da 26c aparece na tela como "CID" (o gatilho `__CID__` do simulador, em negrito pelo Markdown); o texto da resposta traz o aviso "RESPOSTA SIMULADA".

## 6. README da fonte (Passo 5)
`HealthHub-BackEnd/src/modules/ai/data/cid10/README.md` ganhou a frase do CBCD **como o pedido a forneceu**: "O CBCD disponibiliza a CID-10, versão eletrônica, em diversos formatos e padrões, estimulando, assim, a utilização da mesma e permitindo a melhoria da qualidade da informação fornecida." Data de leitura registrada: 24/11/2026. **Não conferido por mim:** a página do DATASUS não abriu daqui (conexão recusada, em todas as tentativas); por isso não verifiquei se a frase é idêntica nem li o restante da página. O README diz que a frase **não é uma licença formal** e não afirma que a página traga termos de licença.

## 7. Testes
**Contagens:** backend **265 → 319 (tentativa X) → 350 (X2)**; frontend **119 → 122 → 126**. Builds e `tsc` ok. Prova do build (`verificar-build-cid10.mjs`): APROVADO.
**Testes novos em X2:** backend +31 (`historico-seguro.spec.ts` 15; 12 líquidos em `cid10-extracao.spec.ts`; 4 em `clinical-chat-cid.spec.ts`); frontend +4 (`historicoChat.spec.ts`).
**Testes ANTIGOS alterados (esperados escritos à mão do pedido 7, Passo 3):**
| Teste | Esperado antigo | Esperado novo | Motivo |
|---|---|---|---|
| `cid10-extracao.spec` "quarto caractere sem ponto" (`CID: E119 sem ponto`) | `[]` | `['E119']` | a linha que começa por `CID:` agora aceita código de 4 caracteres sem ponto; o caso "demais linhas" virou teste novo (continua `[]`) |
| `cid10-extracao.spec` "três situações no formato do pedido" | `- X123 – não consta...` | `- X12.3 – não consta...` | formato oficial no bloco |
| `clinical-chat-cid.spec` "um código válido e um inválido" | modelo escreve `E999`; bloco `- E999 –` | modelo escreve `E99.9`; bloco `- E99.9 –` | formato oficial (a entrada sem ponto não é extraída fora da linha `CID-10:`) |
| `clinical-chat-cid.spec` "resposta truncada" | `- J189 – ...` | `- J18.9 – ...` | formato oficial |
| `blocoConferenciaCid.spec` (frontend) | `X123` (2 textos) | `X12.3` | formato oficial |
Nenhum outro teste antigo foi alterado; os de erro 429, 500 e 503 passaram sem mudança.

## 8. Verificações em clone limpo de X2 (provedor simulado, banco `healthhub_test_r6`, 11 migrações)
Esperados escritos à mão nos próprios scripts das rodadas anteriores (versionados). Ambiente: Windows 11, Node 24, PostgreSQL em contêiner, clone novo de X2.
| Verificação | Resultado |
|---|---|
| Builds, testes, varredura de segredos | backend 350 e frontend 126 passam; 0 achados |
| Registro de eventos | **14/14** |
| S1, S2, S3, S4, S4-mensagem, S4-médico, S5, S7 | **APROVADO** (S8 registrado, sem critério) |
| S6 | **APROVADO** |
| TF01–TF04, TF08, TF09 | **APROVADO** (TF06 documentado, TF07 observado) |
| TF05 | **26/26** |
| Ida e volta no banco | **10/10** |
| Concorrência (20 repetições) | 0 senhas duplicadas, 0 entradas duplicadas, 0 respostas 5xx |
| `GET /health` | 200 |
| 22 cenários pela tela + F18 | **23 de 23 APROVADOS** (0 reprovados, 0 quebras de automação) |

## 9. Divergências, pendências e achados
1. **Revisão independente do código de X2 (agente somente-leitura) achou 4 defeitos de gravidade baixa a média, que NÃO corrigi** para manter uma única versão final verificada (mudar o código exigiria refazer toda a verificação):
   - **Média (extração):** o intervalo `T36‑T50` com o hífen não separável U+2011 (que o modelo usa) vira dois códigos falsos (`T36`, `T50`); com `-`, `–` e `—` funciona. Correção: incluir U+2011 na classe do intervalo em `cid10-extracao.ts`.
   - **Baixa-média (tela):** as mensagens de erro do chat ("Erro ao conectar com o assistente." e a do 429) são criadas sem `local` e voltam à Groq como mensagem do assistente nas 4 interações seguintes. Não vaza nome; só gasta tokens. Correção: marcá-las `local: true`.
   - **Baixa:** se os CSV não puderem ser lidos, cada chat tenta ler de novo e loga de novo (a resposta do modelo não se perde).
   - **Baixa (teste):** uma asserção em `clinical-chat-cid.spec.ts` (`not.toContain('QUE O MODELO ESCREVEU: consta')`) é vazia; a conferência real está na asserção anterior.
   Também: a regex da saudação depende do texto exato da tela (sem constante compartilhada).
2. **Nome no histórico:** corrigido na origem e com defesa no backend, mas o filtro **por nome** só age se o cliente enviar o nome (hoje não envia). O nome digitado pelo profissional no texto livre ou na anamnese segue como digitado (documentado).
3. **Licença do DATASUS:** frase do CBCD registrada como fornecida pelo pedido; página não conferida por mim.
4. As respostas reais **continuam sendo cortadas** em 1.024 tokens depois da linha de CID; o conteúdo clínico depois disso pode ficar incompleto. `max_tokens` não foi alterado (2B não acionada).
5. A Figura 26 e a 26b têm a mesma resposta real; a 26c é simulada e está rotulada.
6. Amostra de 3 chamadas reais.
