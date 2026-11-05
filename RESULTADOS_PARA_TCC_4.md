# RESULTADOS_PARA_TCC_4: limiares com fonte, pressão arterial, verificação, capturas

Rodada 3 do HealthHub (pedido 4). Data: 05/11/2026. Branch de trabalho `limiares-com-fonte` (ponto de restauração: etiqueta `pre-limiares-fonte`, commit `bb85584`). **Nenhuma chamada real à Groq** nesta rodada (provedor simulado). Nenhum dado real, nenhum segredo nos arquivos.

**Versão testada (código):** `fcd4891e68e5ed67ea9eaaf9a1d970efab621ca3`. Depois dele só entraram scripts e evidências, sem mudança de código de produto (commits `5dfd8fc` e `87c4eb3` mexem só em `evidencias_tcc/scripts_verificacao/`). O clone limpo usou `87c4eb3` para rodar os scripts; o código de `HealthHub-BackEnd/src` e `HealthHub-Project/src` é idêntico ao de `fcd4891`. O hash final publicado e a etiqueta `tcc-rodada-final-3` estão no `LEIAME.txt` do ZIP.

## Etapas 1 e 2: limiares com fonte e implementação

### Tabela final de limiares

| Sinal | Nível | Regra | Fonte do número | Mudou? |
|---|---|---|---|---|
| FC (bpm) | crítico | `< 60` ou `> 100` | POP.HC-UFTM-DENF.003 v6 (Ebserh, 2025), Anexo E | não |
| FC (bpm) | atenção | `> 90` | SIRS (Bone et al., Chest 1992); NEWS2 (RCP, 2017) | só a fonte |
| SpO₂ (%) | crítico | `< 92` | NEWS2 (RCP, 2017), escala 1 (≤ 91 = 3 pontos) | só a fonte |
| SpO₂ (%) | atenção | `< 95` | POP Anexo H; NEWS2 (94 a 95 = 1 ponto) | não |
| Temperatura (°C) | crítico | `>= 39,1` | POP Anexo F; NEWS2 (≥ 39,1 = 2 pontos) | **sim** (antes `> 38,5`) |
| Temperatura (°C) | atenção | `>= 37,8` | POP Anexo F | não |
| Pressão (mmHg) | crítico | PAS `<= 90` ou PAS `>= 180` ou PAD `>= 120` | PAS ≤ 90: NEWS2 e POP Anexo A; ≥ 180/≥ 120: Posicionamento Luso-Brasileiro de Emergências Hipertensivas 2020 (SBC), Linha de cuidado (MS), POP Anexo D | **novo** |
| Pressão (mmHg) | atenção | PAS 91 a 100 ou PAS `>= 140` ou PAD `>= 90` | PAS 91-100: NEWS2 e POP Anexo A; ≥ 140/≥ 90: Diretrizes Brasileiras de Hipertensão 2020 (SBC), Quadro 3.4, e Linha de cuidado (MS) | **novo** |

Nenhum limiar tem mais `fonte: null`. A chave `ALERTAS_SEM_FONTE`/`VITE_ALERTAS_SEM_FONTE` foi mantida; **hoje não desliga nenhum alerta real** (os testes provam o mecanismo com limiar sintético). A regra completa, em português, está em `limiares/regras_alerta.md` do ZIP. As três redações da crise hipertensiva (SBC, Ministério da Saúde, POP) estão em `fonte_pressao_critica` nos dois arquivos de configuração. O texto do alerta de pressão diz "pressão elevada", não "hipertensão diagnosticada".

### Regra de formato da pressão
Texto livre (coluna `varchar`, **sem migração, sem campo novo, sem mudar as faixas de recusa do servidor**). Vale se casar com `^\s*(\d{2,3})\s*[/xX]\s*(\d{2,3})\s*$` e PAS e PAD estiverem entre 30 e 300. Caso contrário é desconhecida: sem alerta e sem erro. Testados: `120/80`, `120x80`, `120 / 80`, ` 90/60 ` (válidas) e `90`, `abc`, `120/`, `/80`, vazio, `null`, `300/20`, `29/80`, `1200/80` (inválidas).

### Lista de todos os usos de limiar (mapeamento)
| Onde | O que fazia | Situação |
|---|---|---|
| `HealthHub-Project/src/config/limiaresSinaisVitais.ts` | configuração central (frontend) | atualizado |
| `HealthHub-BackEnd/src/config/limiares-sinais-vitais.ts` | configuração central (backend, só crítico) | atualizado |
| `HealthHub-Project/src/utils/vitalStatus.ts` (`getVitalStatus`, `spo2Status`, `fcStatus`, `tempStatus`, novo `pressaoStatus`) | estado de cada sinal e estado geral | lê a configuração central |
| `HealthHub-Project/src/utils/pressaoArterial.ts` (novo) | `lerPressao` e `nivelPressao` | novo |
| `HealthHub-BackEnd/src/config/pressao-arterial.ts` (novo) | `lerPressao` e `pressaoCritica` (mesma regra) | novo |
| `HealthHub-BackEnd/src/modules/metricas/application/calcular-metricas.ts` (`motivoCritico`) | lista "atenção agora" e `GET /metricas` | lê a configuração central; inclui temperatura ≥ 39,1 e pressão |
| `HealthHub-Project/src/components/CardDashboard/index.tsx` | cartões do paciente em foco | novo cartão **Pressão arterial**, Estado geral inclui a pressão (grade 170 px mínimos para caber 5 cartões em 1280 px) |
| Cartões da esteira (`Alerts`), `Patients`, `Monitoring`, `AdmitirModal` | mostram cor de **classificação de risco** ou o valor, sem limiar de sinal | **sem uso de limiar** (conferido por busca no código) |
| PDF do prontuário e da guia (`ExportPDF`) | cores fixas por rótulo (ex.: vermelho no rótulo da pressão), **não** por limiar | não colorem por limiar: **nada a mudar** |
| Busca por `38.5`, `38,5`, `92`, `95`, `> 90` fora da configuração | sem outro uso | nenhum uso solto restante (só comentários históricos e testes) |

### Testes alterados (com o motivo) e novos
Contagens: backend **187 → 250**; frontend **47 → 109** (todos passam; builds do backend e do frontend ok).

| Teste | Mudança | Motivo |
|---|---|---|
| `HealthHub-Project/src/utils/vitalStatus.spec.ts`, `tempStatus(38.6)` | de `critical` para `warning`; acrescentados 39,0 (`warning`) e 39,1 (`critical`) | o crítico da temperatura passou de `> 38,5` para `>= 39,1` |
| `HealthHub-Project/src/config/limiaresSinaisVitais.spec.ts` | reescrito | valores novos; todos com fonte (antes três eram `null`); chave testada com limiar sintético; casos de pressão; o caso "temperatura 38,6 crítica" virou atenção |
| `HealthHub-BackEnd/src/modules/metricas/application/alertas-sem-fonte.spec.ts` | reescrito | mesmos motivos; antes os testes de `false` desligavam SpO₂ < 92 e temperatura (hoje têm fonte) |
| `calcular-metricas.spec.ts` (backend) | **não alterado** | continua passando (`38,5` nunca foi crítico no novo limiar) |
| Testes de FC, SpO₂ e temperatura em faixas que não mudaram | **não alterados** | — |
| Novos: `pressaoArterial.spec.ts` (frontend, inclui paridade com `limiares-fixtures.json`), `pressao-arterial.spec.ts` (backend, idem) | novos | fronteiras, formatos, pior nível vence, pressão inválida |

Os esperados de fronteira foram **digitados a partir da tabela** (e de `limiares-fixtures.json`, escrito à mão), nunca calculados pela função testada. A paridade frontend × backend usa o **mesmo arquivo** (`limiares-fixtures.json`, 48 casos); no backend compara só o recorte crítico.

### Commits desta rodada
`bef3d11` (limiares, pressão, painel, testes), `74aec5c` (título correto da fonte da SBC), `dae9067` (scripts), `b0cc440` + `fcd4891` (documentação; o `b0cc440` removeu por engano linhas do `DOCUMENTO_ENGENHARIA_SOFTWARE.md` e o `fcd4891` as restaurou, mantendo só a seção 9.7 nova; está explicado nas mensagens), `5dfd8fc` e `87c4eb3` (scripts de verificação e capturas). Conferi `git diff --stat` antes de cada commit; só entraram arquivos do escopo. As 3 exclusões de PDFs de `rodada_final_2/capturas/pdfs_gerados/` que já apareciam no `git status` antes de eu começar **não** foram incluídas em nenhum commit.

## Etapa 3: conferência das fontes
Detalhe em `limiares/fontes_limiares.md`. Resumo:

| Fonte | Resultado |
|---|---|
| NEWS2 (RCP, 2017), Chart 1 | **confere** (SpO₂ escala 1 ≤91/92-93/94-95/≥96; PAS ≤90/91-100/101-110/111-219; pulso 91-110; temperatura ≥39,1). O endereço do pedido (`rcplondon.ac.uk`) redireciona para `rcp.ac.uk` |
| POP.HC-UFTM-DENF.003 v6 (2025) | **confere** nos Anexos A, E, F, H. **Anexo D (pressão) com colunas trocadas na extração**, como o pedido avisava; usado só como apoio |
| SIRS (Bone et al., Chest 1992;101(6):1644-55) | **conferido só em fontes secundárias**; o artigo original não foi lido por mim |
| Diretrizes Brasileiras de Hipertensão 2020 (SBC) | **confere em parte**: título, autoria, revista, ano (2021), vol. 116(3), DOI e texto "PAS ≥ 140 e/ou PAD ≥ 90"; o Quadro 3.4 é imagem (células não lidas); **páginas 516-658: não conferidas por mim, valor recebido no pedido** |
| Linha de cuidado do adulto com HAS (MS, 2021) | **confere** ("superior a 180 mmHg ... superior a 120 mmHg"); a tabela de estágios nela vem da 7ª Diretriz (2017) |
| Posicionamento SBC (crise hipertensiva) | **confere o valor** (PAS ≥ 180 e/ou PAD ≥ 120; "o padrão numérico ... é conceitual ... não deve ser usado como critério absoluto"). **Divergência de título:** o PDF do link é o *Posicionamento Luso-Brasileiro de Emergências Hipertensivas – 2020* (Vilela-Martin et al., Arq Bras Cardiol 2020;114(4):736-751), não "Posicionamento Brasileiro sobre Crise Hipertensiva". Usei o título real |

## Etapa 4: verificação em clone limpo

**Ambiente.** Windows 11 Pro 10.0.26200; Node v24.20.0; PostgreSQL 16.15 (contêiner `healthhub-test-db`, porta 5435, banco novo `healthhub_test_r3`, 11 migrações do zero + seed fictício); Microsoft Edge 156.0.4314.58 (headless); IA simulada (`mock-groq.cjs`). Execução em 05/11/2026, aprox. 12:10 a 12:40 (horário local). Clone: `HealthHub_r3_clone` da branch `limiares-com-fonte` (`npm ci` nos dois pacotes). Banco de desenvolvimento (5433) intocado.

**Contagens e builds:** backend 21 arquivos, **250 testes** passam; frontend 9 arquivos, **109 testes** passam; `nest build` e `vite build` ok; `GET /health` = 200 (`{"status":"ok","database":"up"}`).

| Grupo | Resultado |
|---|---|
| 22 cenários (F01 a F17, C01 a C05) pela tela | **22/22 APROVADO** |
| **F18** (novo: PA 190/120, 85/50, 130/85 na tela do médico) | **APROVADO** (Crítico, Crítico, Estável; cartão PA e lista "atenção agora" coerentes) |
| Registro de eventos (API) | 14/14 |
| S1, S2, S3, S4, S4-médico, S5, S6, S7 | APROVADO |
| S4-mensagem | **REPROVADO** (divergência já conhecida e documentada na rodada 2: a recepção recebe a mensagem genérica "Acesso negado para este perfil"; fora do escopo desta rodada, não foi alterado) |
| S8 | REGISTRADO (salto de estado aceito; sem critério de aprovação) |
| TF01 a TF04, TF08 | APROVADO |
| TF05 (fronteiras, 26 casos: SpO₂, FC, temperatura, pressão) | **26/26** (`limiares/fronteiras_resultados.csv`) |
| TF06 | DOCUMENTADO; TF07: OBSERVADO (14 operações, 10 com ao menos um 403) |
| **TF09** (novo: `120x80`, `abc`, vazio, `190X120`, `120 / 80`) | **APROVADO** |
| Ida e volta pelo banco (temperatura 37,8 e 39,1; SpO₂ 92, 94, 95; FC 90, 91; PA 180/80, 179/119, 90/60) | **10/10**; todos os valores voltaram **exatamente iguais** (a coluna `float` não alterou nenhuma fronteira) |
| Concorrência (20 repetições) | 0 senha duplicada, 0 entrada duplicada, 0 resposta 5xx |

**Falha de automação registrada (não do sistema).** Na primeira execução o TF09 saiu REPROVADO porque o script usava um CPF fixo que colidia com outro script (HTTP 400 de CPF duplicado). Corrigi o **script** (CPF único por execução), recriei o banco do zero e **rodei toda a verificação novamente**; os resultados acima são desta segunda execução. A primeira ficou guardada, sem edição, em `evidencias_tcc/rodada_final_3/execucao_invalida_cpf_tf09/`.

**GET /metricas com fronteiras:** a cobertura é feita por `motivoCritico` (mesma função usada por `/metricas`), nos testes de paridade (48 casos) e no F18/TF09 pela API. Exemplos observados: `PA 190/120`, `PA 85/50`, `Temperatura 39.1 °C` aparecem na lista; `38.6`, `39.0`, `120x80`, `abc` não geram alerta crítico.

### Desempenho (A/B, mesma hora, mesmo banco, alternando código anterior e novo; 2 rodadas)
Mesma metodologia (aquecimento 10, 200 por linha, 10 simultâneos; escrita com 100). Código anterior = `98b375d`/`bb85584` (clone da rodada 2). Valores p95 em ms (p50 e p99 em `verificacao/desempenho.csv`):

| Linha | antigo #1 | novo #1 | antigo #2 | novo #2 |
|---|---|---|---|---|
| GET /fila 500, sequencial | 31,3 | 35,0 | 22,9 | 27,4 |
| GET /fila 500, 10 simultâneos | 105,0 | 109,2 | 67,1 | 74,0 |
| GET /metricas 500, sequencial | 79,5 | 69,0 | 56,5 | 57,9 |
| GET /metricas 500, 10 simultâneos | 592,3 | 381,3 | 350,3 | 357,4 |
| POST /fila | 37,4 | 35,0 | 35,6 | 35,2 |
| PUT /fila/:id (classificar) | 32,4 | 29,3 | 30,9 | 31,3 |

**Conclusão:** a interpretação da pressão em `calcular-metricas` **não piorou** o desempenho: as diferenças entre antigo e novo são menores que a variação entre as duas rodadas do mesmo código. Há ruído da máquina (a repetição #1 foi mais lenta nos dois), por isso o A/B alternado. Os números não são comparáveis com os de rodadas anteriores (outro momento, outra carga da máquina).

## Etapa 5: capturas de tela
`capturas/` (10 PNG, 1280 × 800, tema claro, Médico/Enfermeiro Teste, pacientes TESTE C a K), `figuras_manifesto.csv` e `legendas_sugeridas.md`. Cada captura foi conferida contra o texto da tela pelo script (ex.: cartão "Pressão arterial 85/50 mmHg Crítico" = verdadeiro) e três foram vistas por mim (fig19, fig19b, novo11).

- `fig19_painel`, `fig19b_painel_atencao_agora` (lista com "PA 190/120", "PA 85/50", "Temperatura 39.1 °C"), `fig20_historico_sinais`, `fig30_painel_atencao_f14`, `novo11_pa_critica_painel`, `novo12a/b/c` (130/85 Normal, 150/95 Atenção, 85/50 Crítico), `novo13a/b` (39,1 Crítico; 39,0 Atenção).
- **fig30 (F14):** nenhum estado mudou para TESTE E (SpO₂ 92, 38,5 °C, FC 88, PA 130/85: Atenção antes e depois). TESTE C (38,6 °C) segue Crítico por SpO₂ 91 e FC 110, mas a temperatura saiu dos motivos (agora Atenção).
- Prontuário em PDF, guia e cartões da esteira **não colorem por limiar**, então as figuras 13, 22 e 29 não precisaram ser refeitas. As capturas da rodada 2 com painel mostrando 38,6 °C como motivo crítico (`rodada_final_2`: fig16b e fig22) ficam desatualizadas.
- Os números 19/19b, 20 e 30 são os do pedido; coincidem em parte com nomes de arquivos da rodada 2 (`fig19_prontuario_pdf`, `fig20_recusa_temperatura`, que eram de outra numeração), por isso uso só os desta pasta.
- Na `fig19b`, o paciente em foco mostrado é TESTE K (o painel abre no último da lista); isso é só o foco padrão.

## Antes e depois (casos afetados)
Em `limiares/antes_depois.csv`. Resumo: C01, C02, C04, C05 e F14-TESTE E **não mudam de estado**; C03 e F14-TESTE C continuam Crítico mas **sem a temperatura 38,6 como motivo** (agora Atenção); TF05: temperatura 38,6 e 39,0 passam de crítico para atenção, 39,1 é crítico; pressão passa a ter alerta.

## Pendências que dependem de mim
1. **Orientador:** confirmar o uso dos limiares e a nomenclatura "atenção/crítico" como convenção do projeto (as fontes não usam esses rótulos); validar clinicamente não é papel do sistema.
2. **TCC:** citar o **título real** da fonte da SBC (Posicionamento Luso-Brasileiro de Emergências Hipertensivas 2020); conferir as **páginas da Diretriz 2020** (516-658) e, se quiser, o artigo original de Bone et al. (1992); trocar as figuras 19, 20 e 30 e adicionar as novas; atualizar o texto que dizia "temperatura > 38,5 °C" e "pressão sem alerta"; citar que a chave `ALERTAS_SEM_FONTE` hoje não desliga nenhum alerta.
3. **S4-mensagem** continua reprovado por divergência conhecida (mensagem genérica para a recepção), documentada, fora do escopo.
4. Pendências antigas: preço e medição na VPS; limite de login (10 tentativas só em produção); nome do autor em Termos/Política/PDF (mantido por decisão sua).
5. Limpeza que **não** fiz sem sua ordem: banco `healthhub_test_r3`, clones `HealthHub_r3_clone` e `HealthHub_r2_clone` e as pastas soltas do `git status`.
