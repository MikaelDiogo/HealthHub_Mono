# Resultados para o TCC, rodada 2 (04/11/2026)

Este arquivo reúne o que foi feito, medido e verificado nesta rodada. Tudo foi executado em ambiente local, com **banco de teste isolado, dados fictícios e IA simulada** (exceto as 4 capturas marcadas como "provedor real"). Nada foi inventado: o que falhou ou divergiu está dito.

- **Versão testada (clone limpo):** `98b375d771c04ac2006e2c30e213787cf02a0d21` (branch `evolucao-estrutura`). Esta é a **única versão a citar como testada**.
- **Commit publicado final (tag `tcc-rodada-final-2`):** é o commit que acrescenta só este arquivo e as evidências (`evidencias_tcc/rodada_final_2/`) sobre a versão testada; o código-fonte é idêntico ao de `98b375d` (conferido com `git diff --stat 98b375d <tag> -- HealthHub-BackEnd HealthHub-Project`, sem diferenças). O hash exato está em `git rev-parse tcc-rodada-final-2`.
- **Ambiente:** Windows 11 Pro 10.0.26200, Node v24.20.0, npm 11.19.0, PostgreSQL 16.15 (contêiner de teste, porta 5435), Docker 29.7.2 (`etapa6_verificacao/ambiente.txt`).
- **Testes:** backend **187** (antes 152), frontend **47** (antes 25); builds dos dois pacotes passam.

---

## Etapa 1: cadastro mínimo (só o nome é obrigatório)

**Commits:** `b0351da` (código e testes), `02ba719` (textos, documento de engenharia, política de dados e scripts).

**O que mudou**
- **Nome é o único campo obrigatório.** CPF, RG, idade, sexo, telefone, endereço, alergias, medicamentos e anamnese são opcionais. Campo opcional vazio (`""`) vira `NULL`; o formato só é validado quando há valor (CPF com 11 dígitos, idade inteira de 0 a 150, telefone com 10 ou 11 dígitos). O CPF continua **único quando preenchido** (vários pacientes sem CPF são permitidos; CPF repetido preenchido é recusado com 400, também em corrida, pelo índice único).
- **Sexo virou lista** (Masculino/Feminino, com opção de limpar), nos três formulários (adicionar, editar e cadastro no celular). Grava `M` ou `F`. Valores antigos (inclusive "Outro") continuam aparecendo na edição de quem já os tem; o servidor ainda aceita `M`, `F` e `Outro`.
- **Nome desconhecido.** Caixa abaixo do Nome: o campo trava com "Paciente não identificado (#xxxx)" e o servidor grava o nome definitivo **"Paciente não identificado (#" + os 4 primeiros caracteres do id + ")"** e a marca `nome_provisorio = true`. **Escolha:** o id (UUID) é gerado no servidor, no serviço, antes de gravar (`randomUUID`), para o nome poder usá-lo. Quatro caracteres não são únicos (65.536 combinações), mas isso não causa problema: o nome não tem restrição de unicidade e quem identifica o paciente é o id; o selo "Nome provisório" e o próprio id desfazem a ambiguidade.
- **Correção do nome.** A edição do paciente (`PUT /patients/:id`) grava o novo nome; se o nome mudou, a marca `nome_provisorio` volta a `false`. Nome vazio na edição continua recusado (400). **Permissões inalteradas:** só médico e enfermeiro editam; a recepção continua recebendo 403. **Relato:** quem cadastra "nome desconhecido" é, em geral, a recepção, que **não** pode corrigir o nome depois; a correção depende de médico ou enfermeiro. Não alterei permissões.
- **Esteira.** A esteira guarda cópia de nome e idade do cadastro. Ao editar o nome ou a idade de quem **está na esteira**, a cópia é atualizada **na mesma transação** (`saveSincronizandoFila`) e o servidor emite `fila:changed`, então o cartão muda sem recarregar. A idade da esteira passou a aceitar `NULL`. A listagem da esteira junta, só na leitura, a marca de nome provisório (`LEFT JOIN` com `pacientes`).
- **Exibição.** Selo discreto "Nome provisório" na lista de pacientes, na esteira, no painel (lista lateral, "atenção agora" e paciente em foco), na busca da admissão, na barra lateral, na tela mobile, na edição e no PDF do prontuário (acrescenta "(nome provisório)"). Idade ausente aparece como "—" (nunca "0 anos"); nome ausente em registro antigo aparece como "Sem identificação (#xxxx)".
- **IA.** Continua sem nome (`contextoSemIdentificacao`); alergias, medicamentos e anamnese ausentes (`null`) não quebram o prompt (teste novo).
- **Nome 1 a 150 caracteres** no servidor (antes 3 a 150), com `trim`; o formulário continua limitando em 100. **Decisão tomada com o autor:** manter 150 no servidor para não recusar nomes já cadastrados (o pedido dizia "máximo 100").

**Migração `1783500000000-CadastroMinimoNomeProvisorio` (reversível).** Torna `pacientes.cpf`, `pacientes.idade`, `pacientes.sexo` e `fila_pacientes.idade` anuláveis e cria `pacientes.nome_provisorio boolean default false`. O `down` **recusa reverter** se existir cadastro sem CPF, idade ou sexo (não inventa valores). Log: `rodada_final_2/etapa1_migracao.txt` (aplicar → recusa com 2 cadastros sem CPF → reverter depois de remover → reaplicar). Contagem agora: **11 migrações**.

**Testes novos** (backend `patients.http.spec.ts`, 25 casos, e outros): sem nome → 400; só com o nome → 201; nome de 1 caractere aceito; `""` vira `null`; dois sem CPF; CPF repetido preenchido → 400; CPF e idade e telefone inválidos → 400; sexo M/F/Outro aceitos; os três perfis cadastram; nome desconhecido gera o provisório com a marca; nome enviado junto é ignorado; edição limpa a marca; editar outro campo mantém a marca; nome vazio na edição → 400; recepção edita → 403; médico e enfermeiro editam; cópia da esteira atualizada e `fila:changed` emitido; CPF de outro paciente na edição → 400; admissão sem idade. Frontend: utilitário `nomeProvisorio` (selo, idade ausente, nome ausente, lista de sexo). IA: contexto sem alergias, medicamentos e anamnese.

**Documentação.** `DOCUMENTO_ENGENHARIA_SOFTWARE.md` (RF-04, RF-05, RF-07, RN-01, RN-12, RN-13, diagrama de classes, restrições, linha do tempo de migrações, DEB-20 e a nova **seção 7.4** com a regra, a justificativa de urgência, os riscos de duplicidade e de identificação incorreta e a mitigação pelo nome provisório); Swagger; Readme do backend (11 migrações); README raiz; textos dos Termos de uso, da página da Política de Dados e do **PDF da política**.

**Busca de consistência (termos pedidos), arquivos alterados:** `DOCUMENTO_ENGENHARIA_SOFTWARE.md`, `README.md`, `HealthHub-BackEnd/Readme.md`, `HealthHub-BackEnd/src/modules/patients/presentation/patients.controller.ts` (Swagger), `HealthHub-Project/src/components/Buttons/index.tsx`, `ModalEditPatient.tsx`, `pages/MobileTriage/index.tsx`, `components/TermosUsoModal/index.tsx`, `pages/PoliticaDados/index.tsx`, `utils/gerarPDFPolitica.ts`, `utils/erro.spec.ts` e os scripts abaixo. `PLANO_MIGRACAO.md` só tinha "obrigatório" em outro sentido (variáveis de ambiente), então **não mudou**.

**Arquivos antigos mantidos (evidência histórica, não editados):** as 6 imagens `rodada_final/cenarios22/prints/F02_*` e `F17_cadastro*`, `rodada_final/cenarios22/resultados.json` e `execucao_cenarios.log`, `rodada_final/cenarios22_execucao1/`, `rodada_final/tf/tf_resultados.json`, `evidencias_tcc/09_historico.md`, `RESULTADOS_PARA_TCC.md`, e, **de propósito**, os instrumentos do ensaio cronometrado (`cartoes_caso.html`, `formulario_papel.html`, `casos_fonte.csv`, `gerar_instrumentos.mjs`), porque as 30 medições foram feitas com o cadastro completo. Tudo explicado em `evidencias_tcc/LEIA-ME_EVIDENCIAS_ANTIGAS.md`.

**Ajustes nos scripts de verificação (um por motivo):**
1. `cenarios22/lib.mjs` (novo `escolherSexo`): o campo Sexo deixou de ser texto digitado e passou a ser lista; usado em F02, F03, F07 e F16/F17 (`f02_f06.mjs`, `f03_f06.mjs`, `f07_f09.mjs`, `f16_f17.mjs`).
2. `f02_f06.mjs` (F02): o aviso do cadastro vazio agora é o erro do próprio campo Nome (a tela não envia a requisição); o script aceita o aviso vermelho **ou** o erro do campo. A regra do F02 continua valendo: cadastro vazio é recusado e a tela avisa.
3. `tf/tf_casos.mjs` (TF01): "dados mínimos" passa a ser só o nome (verifica também que CPF, idade e sexo ficam `null`).
4. `f15.mjs` e `mock/capturas_finais.mjs`: o contato do chat passou de "Dr. João Silva" para "Médico Teste" (seed fictício, Etapa 2).
5. Scripts movidos para `scripts_verificacao/` sem caminhos pessoais (`CDP_LIB`, `EV_DIR`, raiz descoberta pela posição do arquivo).
Nenhum outro script precisou de ajuste.

---

## Etapa 2: nome real do autor no seed

**Commit:** `21a15b3`. O `seed.ts` passou a ter **Recepcionista Teste, Enfermeiro Teste e Médico Teste** (antes: "Dr. João Silva", "Ana Souza" e o nome real do autor). Verificado no clone: o seed criou exatamente esses três nomes. Bancos já existentes (por exemplo, o de desenvolvimento) **não mudam sozinhos** (o seed só cria quem não existe); para renomear neles, é preciso um `UPDATE users SET nome = ...`.

**Arquivos do repositório publicado que ainda têm o nome real do autor (não alterei, são crédito de autoria, link ou histórico):**
| Arquivo | Onde | O que é |
|---|---|---|
| `DOCUMENTO_ENGENHARIA_SOFTWARE.md` | linha 10 | campo "Autor" |
| `HealthHub-Project/src/components/TermosUsoModal/index.tsx` | linha 339 | "Autor: …" no rodapé dos Termos (**aparece em tela**) |
| `HealthHub-Project/src/pages/PoliticaDados/index.tsx` | linha 176 | idem, na página da Política (**em tela**) |
| `HealthHub-Project/src/utils/gerarPDFPolitica.ts` | linha 246 | idem, no **PDF** da política |
| `benchmark/harness/RELATORIO_BENCHMARK.md` | linha 4 | "Autor" |
| `PLANO_MIGRACAO.md` | linhas 72 e 73 | links para repositórios de GitHub (nome de usuário) |
| `evidencias_tcc/01_versao.md` | linha 48 | texto histórico sobre o seed (desatualizado: o seed já não tem o nome) |

**Fora do Git (pastas soltas do grupo "d", Etapa 5):** `coleta_tcc/` (5 arquivos), `eval/RELATORIO_BENCHMARK.md`, `evidencias_testes_2026-10-29/runner/preencher_ficha.mjs` e `preencher_ficha_final.mjs`, `.agents/skills/design-taste-frontend/library/photos.json`.

**Decisão sua (pendente):** o crédito de autoria aparece em **tela e em PDF** (Termos, Política). A regra "nenhum nome real em tela, captura ou log" pode pedir que isso mude. As capturas desta rodada **não** mostram o rodapé com o crédito (o `novo03` mostra só a seção da IA; o `novo10` mostra só a primeira página do PDF).

---

## Etapa 3: limiares de alerta (nenhum valor foi alterado)

**Commit:** `3e56feb`. **Como foi feito:** as branches A e B tinham sido abertas antes de vários commits atuais e as duas editam os mesmos arquivos, então **não dava para fazer merge das duas**. Parti de `evolucao-estrutura` e portei à mão o que o pedido quer: limiares centralizados com campo `fonte` (`HealthHub-BackEnd/src/config/limiares-sinais-vitais.ts`, só "crítico", e `HealthHub-Project/src/config/limiaresSinaisVitais.ts`) e a chave `ALERTAS_SEM_FONTE`. **A pressão estruturada da Opção A não foi incluída** (decisão do autor): a pressão arterial continua texto livre e sem alerta. As branches A e B foram enviadas ao GitHub só para registro, sem merge. **Merge:** somente em `evolucao-estrutura`; a `master` não foi tocada.

| Limiar | Valor | Nível | Fonte registrada |
|---|---|---|---|
| FC | < 60 e > 100 bpm | crítico | POP.HC-UFTM-DENF.003 v6 (HC-UFTM/Ebserh, 2025), Anexo E: faixa de referência do adulto, 60 a 100 bpm |
| SpO₂ | < 95 % | atenção | POP.HC-UFTM-DENF.003 v6, Anexo H: faixa normal 95 a 100 % |
| Temperatura | >= 37,8 °C | atenção | POP.HC-UFTM-DENF.003 v6, Anexo F: início da febre baixa |
| FC | > 90 bpm | atenção | **`null`** (sem fonte clínica registrada; 90 é o teto da faixa de adolescente no POP) |
| Temperatura | > 38,5 °C | crítico | **`null`** (o POP e o NEWS 2 usam cortes em 38,1 e 39,1) |
| SpO₂ | < 92 % | crítico | **`null`** (coincide com o NEWS 2, mas o POP classifica 91 % como hipóxia leve) |
| Pressão arterial | sem limiar | sem alerta | texto livre |

**Chave:** `ALERTAS_SEM_FONTE` (backend, em `.env.example`, Readme e `env.validation` não exige) e `VITE_ALERTAS_SEM_FONTE` (frontend). Padrão `true` = comportamento idêntico ao de hoje. `false` desliga **só** os três alertas com `fonte: null`; os com fonte continuam. **Comportamento padrão idêntico:** os testes antigos de `vitalStatus.spec.ts` e `calcular-metricas.spec.ts` passam **sem alteração**; testes novos cobrem os dois modos (backend 187, frontend 47 no total). O TF05 (fronteiras exatas) confere 15/15 no clone.

---

## Etapa 4: pensamento estendido nos modelos Claude

**Resposta: com a configuração do harness, os modelos Claude Sonnet 5, Claude Sonnet 5.5 e Claude Opus 5.5 NÃO usam pensamento estendido.**

- Nos CSVs e nas saídas já guardadas em `benchmark/` **não há** campo de raciocínio (só `tokens_out`).
- Fiz uma **sonda de 9 chamadas** (3 vinhetas por modelo) com as mesmas flags do harness (`claude -p --model <id> --system-prompt <prompt do harness> --tools "" --no-session-persistence --permission-prompts none --setting-sources ""`), trocando só a saída para `stream-json --verbose`, versão 2.1.300 do CLI. **Custo estimado antes: cerca de US$ 0,05; custo real: US$ 0,0694** (limite do pedido: US$ 1).
- **Evidência:** em **todas** as 9 chamadas, (1) a resposta tem só bloco `text`, nenhum bloco `thinking`; (2) o CLI informa `thinking_tokens: 0` em `usage.output_tokens_details` e `thinkingTokens: 0` em `modelUsage`; (3) `tokens_out` de 54 a 171 correspondem ao JSON visível.
- **Limite:** 3 vinhetas por modelo e uma versão do CLI. Não prova o mesmo comportamento em outra versão, com outra configuração ou com casos muito mais difíceis. **Groq (`gpt-oss-120b`) continua sem verificação direta** (só inferência pelos `tokens_out`, já registrada).
- Arquivos: `evidencias_tcc/rodada_final_2/etapa4_pensamento_estendido/` (`RESULTADO_SONDA.md`, `sonda_resultado.json`, `bruto/*.jsonl` sem o evento de inicialização do CLI, que trazia o caminho do computador e a lista de conectores da conta; o script `sanear.cjs` mostra o que foi removido) e o `benchmark/README.md` atualizado (commit `7985dab`).

---

## Etapa 5: publicação

**Publicado em `origin/evolucao-estrutura`** (sem `--force`): código e testes (`b0351da`, `02ba719`, `21a15b3`, `3e56feb`), benchmark (`7985dab`), evidências (`1534036`) e README (`98b375d`). Confirmado com `git ls-remote`: `refs/heads/evolucao-estrutura` = `98b375d771c04ac2006e2c30e213787cf02a0d21`. As branches `limiares-opcao-a-pressao-estruturada` (`6d102f4`) e `limiares-opcao-b-chave-de-alertas` (`5773fdb`) foram enviadas só para registro. A **tag anotada `tcc-rodada-final-2`** aponta para o commit final (este arquivo mais as evidências).

**Varredura de segredos antes do push** (sobre tudo que subiu: 4.570 linhas adicionadas): nenhuma chave (`gsk_`, `sk-`, chaves privadas, JWT, `GROQ_API_KEY=` com valor, senhas), nenhum e-mail ou caminho pessoal, nenhum `.env`; `.env`, `eval/.env` e `benchmark/harness/.env` estão no `.gitignore`. **O nome real do autor:** o pedido manda **não publicar e avisar** se ele aparecer nos arquivos a publicar. Nas **linhas novas** deste push **não apareceu**. Ele aparece em 8 trechos de arquivos **já publicados antes** (tabela da Etapa 2); como são crédito de autoria já públicos, **não bloqueei o push**. Se isso for um problema, diga e eu removo.

**Scripts de verificação versionados** em `evidencias_tcc/scripts_verificacao/` (com `README.md` de ordem e ambiente, sem caminhos pessoais): 22 cenários, `e2e_eventos`, `s1_s8` (consolidado), `s6_migration` (novo), TF01 a TF08, concorrência, desempenho, recursos, e depois as capturas. **Atenção:** o pedido dizia que os scripts S1 a S8 estavam fora do repositório; na verdade o script **original por fases** já estava versionado em `evidencias/testes/cenarios_accr.mjs`; o `s1_s8.mjs` é uma versão consolidada e o `s6_migration.mjs` é novo (o S6 antigo foi feito à mão com SQL). O cliente de navegador `cdp.mjs` **não** foi copiado (é de terceiros, com licença própria): o README manda apontar para ele com `CDP_LIB`.

**Ficou de fora (grupo "d", não commitado):** `.agents/`, `.claude/`, `90`, `APENDICE_A_TCC_TESTE.md`, `Print_healthhub/`, `TAREFAS_TCC_CLAUDECODE.md`, `Teste_Bench.md`, `coleta_tcc/`, `eval/`, `evidencias_tcc/mudancas_desta_rodada.patch`, `evidencias_tcc_HH.zip`, `evidencias_testes_2026-10-29/`, `skills-lock.json`. **Pergunta para você:** o que fazer com eles (commitar, ignorar ou apagar)?

---

## Etapa 6: verificação no clone limpo

**Como:** clone do commit `98b375d` em pasta nova, `npm ci` nos dois pacotes, **banco novo** (`healthhub_test_r2clone`) com as 11 migrações aplicadas do zero e o seed com os nomes fictícios, IA simulada. Logs e saídas: `evidencias_tcc/rodada_final_2/etapa6_verificacao/`.

| Verificação | Resultado |
|---|---|
| Build backend e frontend | passam (saída 0) |
| Testes backend / frontend | **187 de 187** / **47 de 47** |
| `GET /health` | HTTP 200, `{"status":"ok","database":"up"}` |
| 22 cenários (tela e API) | **22 de 22 aprovados** (tabela abaixo) |
| Registro de eventos pela API | **14 de 14** checagens OK, 0 falhas |
| S1 a S8 | S1, S2, S3, S4 (403 e nenhuma cor gravada), S5, S6, S7 e S4-médico **aprovados**; **S4-mensagem reprovado** (divergência conhecida, abaixo); S8 registrado (salto aceito, HTTP 200) |
| TF01 a TF08 | TF01 a TF04 e TF08 aprovados; TF05 **15 de 15**; TF06 documentado (saltos e retrocesso aceitos); TF07 observado (matriz de 14 operações, 10 com ao menos um 403) |
| Concorrência (20 repetições) | senha duplicada **0**, entrada duplicada **0**, respostas 5xx **0** (A: 2 admissões simultâneas dão senhas distintas; B: 8 do mesmo paciente dão 1 × 201 e 7 × 409) |

**22 cenários** (todos aprovados): F01 acesso por perfil e senha errada; F02 cadastro vazio recusado com aviso; F03 cadastro e sinais; F04 recusa de 46 °C; F05 senha na admissão; F06 duplicidade (409); F07 iniciar triagem; F08 classificar sem sinais bloqueado; F09 cor com sinais; F10 ordem na esteira; F11 chamar, observação e alta; F12 readmissão com histórico; F13 permissões por perfil na tela; F14 alertas nas fronteiras; F15 chat entre dois perfis em tempo real; F16 prontuário em PDF; F17 cadastro no celular e senha sequencial; C01 a C05 estado geral e lista de atenção para cinco combinações de sinais.

**Divergência conhecida, mantida (S4-mensagem):** a recepção, ao tentar classificar a cor, recebe 403 com a mensagem genérica "Acesso negado para este perfil" (do guard), e não "Apenas o enfermeiro pode atribuir a categoria de risco." (do serviço, que só aparece para o médico, S4-médico). Não ajustei o teste para passar.

**Execuções inválidas, descartadas e guardadas:** o executor dos 22 cenários foi iniciado duas vezes ao mesmo tempo por engano e as saídas se misturaram; guardei em `etapa6_verificacao/invalida_execucao_duplicada/` (com `LEIAME.txt`) e refiz **uma execução limpa** (a que vale).

**Desempenho** (mesma metodologia: aquecimento de 10, 200 por linha, sequencial e com 10 simultâneos; 100 por linha na escrita; 500 entradas na fila):

| Medida | p50 | p95 | p99 | Antes (p95) | Variação do p95 |
|---|---|---|---|---|---|
| `GET /fila`, 500 entradas, 10 simultâneos | 63,5 ms | 83,2 ms | 87,8 ms | 67,5 ms | **+23 %** (repetição: 72,7 ms, +8 %) |
| `GET /metricas`, 500 entradas, 10 simultâneos | 360,2 ms | 416,6 ms | 459,6 ms | 389 ms | +7 % (repetição: 435,9 ms, +12 %) |
| `POST /fila` (100) | 35,3 ms | 128,3 ms | 145,4 ms | 37,1 ms | **+246 %** |
| `PUT /fila/:id` classificar a cor (100) | 30,0 ms | 110,3 ms | 128,6 ms | 30,9 ms | **+257 %** |
| `GET /health` (200) | 15,3 ms | 16,3 ms | 17,0 ms | não medido antes | , |

**Três linhas passaram de 20 % de piora, então investiguei para saber se foi a mudança do cadastro.** Rodei o **código anterior (`1948b84`) e o novo, na mesma hora, no mesmo banco, alternando** (`etapa6_verificacao/ab_escrita/`, `ab_fila/`):
- Escrita (2 rodadas cada): `POST /fila` p95 anterior 121,9 e 93,1 ms; novo 92,5 e 92,1 ms. `PUT` p95 anterior 144,9 e 94,9 ms; novo 140,1 e 101,1 ms. **O código anterior está igual de lento hoje.**
- Leitura (500 entradas, 10 simultâneos): `GET /fila` p95 anterior 103,0 ms; novo 78,8 ms. `GET /metricas` p95 anterior 618,4 ms; novo 396,4 ms.
- **Conclusão:** a diferença para os números da rodada anterior vem do **estado da máquina agora** (navegadores, Vite, Docker e outros programas abertos; p50 e p95 subiram igualmente no código antigo), **não** da mudança do cadastro. Os números antigos e novos **não são comparáveis em valor absoluto**; para o TCC, use o par A/B de hoje ou meça de novo numa máquina parada. **Não repeti** o teste de recuperação após reinício (`disp`), por reiniciar o banco de teste; só o `GET /health` foi medido. Nenhuma chamada real à Groq nesta etapa.

---

## Etapa 7: capturas de tela

Pasta `evidencias_tcc/rodada_final_2/capturas/` (33 PNG + `figuras_manifesto.csv`). Viewport **1280 × 800**, tema claro, zoom 100 %, PNG, a partir do clone da Etapa 6 (commit `98b375d`), usuários Recepcionista Teste, Enfermeiro Teste e Médico Teste, pacientes FICTÍCIO-01 a 06 e TESTE A a E. Conferi **cada imagem a olho** antes de aceitar; as que saíram erradas foram apagadas e refeitas (ficaram em `capturas_descartadas_1/` só por transparência). O manifesto traz arquivo, figura, tela, perfil, paciente, data e hora, hash e observações.

**Provedor de IA real:** `novo04` a `novo07` (Groq `openai/gpt-oss-120b` e `whisper-large-v3-turbo`). **Foram 3 chamadas reais** (2 de chat, das quais a 1ª capturou antes da resposta e foi descartada, e 1 de transcrição), bem abaixo do limite de 10. A chave foi para o ambiente do processo da API sem ser exibida; nenhum arquivo contém `gsk_`. **`novo08` é SIMULADO** (o 429 foi produzido pelo mock; nenhuma chamada real): **rotule a figura como simulada**.

**Tela longa, capturas divididas (registrado no manifesto):** `fig16` (painel) tem a parte 2 em `fig16b` (lista "atenção agora"); `fig21` (esteira) tem a parte 2 em `fig21b` (Verde, Azul e, por último, o paciente sem cor), porque a coluna é mais alta que a janela de 800 px.

**Observações sobre as imagens:** a janela de cadastro (`fig07`, `novo01`, `novo02a`) tem o título "Novo paciente" parcialmente cortado no topo em 800 px de altura (é o formulário real, mais alto que a janela); a **tabela em Markdown** da resposta real da IA (`novo04`) aparece como texto corrido, porque o chat não renderiza tabelas (limitação já registrada); o texto transcrito (`novo07`) vem sem alguns acentos, como o modelo devolveu. A tabela do pedido tem 19 linhas de figuras existentes (não 18): fig06 a fig22, fig24 e fig25.

**Legendas sugeridas (uma frase, para as capturas novas):**
- `novo01`: Figura X - Campo Sexo do cadastro como lista de seleção (Masculino e Feminino), com opção de limpar.
- `novo02a`: Figura X - Cadastro com a opção "Nome desconhecido" marcada: o campo Nome fica travado com o nome provisório "Paciente não identificado (#xxxx)".
- `novo02b`: Figura X - Lista de pacientes mostrando o selo "Nome provisório" no paciente cadastrado sem nome.
- `novo09a`: Figura X - Edição do paciente em que o nome provisório é corrigido pelo enfermeiro (selo "Nome provisório" no cabeçalho).
- `novo09b`: Figura X - Lista de pacientes depois da correção do nome: o selo "Nome provisório" some.
- `novo03`: Figura X - Seção do Termo de Uso sobre o assistente de IA: o nome do paciente não é enviado; o texto cita a Groq, o modelo `gpt-oss-120b` e o Whisper.
- `novo04`: Figura X - Resposta real do assistente de IA (Groq, `gpt-oss-120b`) com diagnósticos diferenciais, sinais de alerta e sugestão de CID para um paciente fictício.
- `novo05`: Figura X - Transcrição de áudio: gravação em andamento.
- `novo06`: Figura X - Transcrição de áudio: envio ao provedor e transcrição em andamento.
- `novo07`: Figura X - Transcrição de áudio: texto transcrito preenchendo o campo da pergunta.
- `novo08`: Figura X - Mensagem exibida ao usuário quando o provedor de IA recusa a chamada por limite (resposta de erro **simulada** em ambiente de teste).
- `novo10`: Figura X - Primeira página do PDF da política de dados regenerado, com o texto do cadastro mínimo atualizado.

---

## Etapa 8: conferência entre código e TCC (sem alterar o código)

Detalhe, com arquivo e linha, e a **matriz rota × perfil** completa: `evidencias_tcc/rodada_final_2/etapa8_conferencia_codigo_tcc.md`. Resumo dos 18 itens:

| # | Afirmação | Resultado |
|---|---|---|
| 1 | bcryptjs custo 12, `bcrypt.compare` | confere |
| 2 | Guard global JWT, exceto login e `/health` | confere |
| 3 | JWT 1 dia, sem refresh nem revogação | confere |
| 4 | Limite de login: 10 por 15 min | **diverge em parte**: o 10 vale só em produção; fora dela o limite é 100 |
| 5 | `helmet()` e corpo de 10 kb | confere |
| 6 | Permissões por perfil | confere, com ressalvas (cor só do enfermeiro é regra do serviço, não do `@Roles`; chat e visitas sem `@Roles`) |
| 7 | 9 entidades; 10 migrações antes | confere; agora **11** migrações |
| 8 | `synchronize=false`; 3001; 5433; 5435; Swagger | confere, com ressalva (5435 é do contêiner de teste; `SWAGGER_ENABLED=true` liga o Swagger em produção) |
| 9 | Senha no servidor, índice único, 409 | confere |
| 10 | Contexto da IA, modelo, Whisper | confere |
| 11 | Prompt: hipóteses e CID; IA não altera a esteira | **confere em parte**: o prompt pede "sugira o CID provável", mas não usa a expressão "hipóteses diagnósticas" |
| 12 | `fila_eventos` só acréscimo; tipos; chaves | confere |
| 13 | Fechar visita não registra evento | confere |
| 14 | Limiares | confere (agora centralizados, com fonte) |
| 15 | Faixas de recusa | confere |
| 16 | Transições não validadas | confere |
| 17 | Ordenação por cor e chegada | confere |
| 18 | Painel usa 60 dias | confere |

**Outras inconsistências encontradas** (todas no arquivo da etapa): crédito de autoria com o nome real em tela e PDF; `gravidade` (esteira) × `classificacao_risco` (visita) para o mesmo conceito; limite de nome 100 no formulário × 150 no servidor; mensagem de recusa da recepção (S4); `01_versao.md` desatualizado; senha do banco de desenvolvimento escrita no README; rotas sem `@Roles`; Swagger ligável em produção.

---

## Pendências que dependem de você

1. **Preço da hospedagem** (VPS): fora deste pedido; a medição de desempenho na VPS fica para depois de contratar.
2. **Decisão do orientador sobre os alertas:** manter os três limiares sem fonte, ou desligá-los com `ALERTAS_SEM_FONTE=false`; e a pressão arterial (sem limiar).
3. **Grupo (d) de pastas soltas** (lista na Etapa 5): commitar, ignorar ou apagar.
4. **Crédito de autoria com o nome real** nos Termos, na Política e no PDF (Etapa 2): manter ou trocar.
5. **Recepção não corrige nome provisório** (Etapa 1): se isso atrapalhar o fluxo, é decisão de permissão (não alterei).
6. **Medidas de desempenho:** repetir numa máquina parada, ou citar só o par A/B, e medir na VPS.
7. **Limpeza opcional** (precisa do seu OK): bancos de teste (`healthhub_test_r2`, `healthhub_test_r2clone`, os anteriores), o clone `HealthHub_r2_clone` e o `HealthHub_rodada_final_clone`.
