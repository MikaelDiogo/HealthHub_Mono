# RESULTADOS PARA O TCC (8): rodada 6 (textos legais, `.env.example` e README alinhados ao código)

**Estado: COMPLETO.** Corrigi os **textos**, não o comportamento: nenhuma regra de negócio, rota, permissão, limite ou chamada à IA mudou. Nenhuma chamada à Groq nesta rodada (nem simulada).

## 0. Versões
| Item | Valor |
|---|---|
| Linha de base publicada | etiqueta `tcc-rodada-final-5` (`6a78645157b1f92eb7b86593ee196b535a38ecb8`); restauração: etiqueta `pre-rodada6` (mesmo commit); branch de trabalho `rodada6-textos` |
| **Commit X (textos, `.env.example`, README, teste), o testado** | `2fe065034d539b27f5b467f71951039bef86c6f6` |
| Commit Y (só `evidencias_tcc/`) | o commit que contém este arquivo; hash completo no `LEIAME.txt` do ZIP e na etiqueta `tcc-rodada-final-6` |
| Prova de código idêntico | `git diff --stat X Y -- . ':!evidencias_tcc' ':!docs'` vazio (saída no `LEIAME.txt`) |
| Escopo do commit X (`git diff --stat`) | só: `TermosUsoModal/index.tsx`, `PoliticaDados/index.tsx`, `gerarPDFPolitica.ts`, `textosLegais.spec.ts`, `HealthHub-BackEnd/.env.example`, `README.md` (raiz) e `HealthHub-BackEnd/Readme.md` |

## 1. Textos legais: antes e depois (T = Termos, P = Política, F = PDF; o PDF fica sem acentos, como já era)
Números de linha = depois da mudança.
| Item do pedido | Antes | Depois | Onde |
|---|---|---|---|
| Zod | "Validação de todos os dados de entrada via Zod (schemas rigorosos)" / "Validação Zod em todos os endpoints" | "Validação dos dados de entrada no backend (class-validator), com lista de campos permitidos" | T:235, P:127, F:183 |
| Logs de auditoria | T: "Logs de auditoria para tentativas de acesso não autorizadas"; P: "Logs de auditoria de acesso"; F: não tinha | "Registro de eventos da esteira (autor, perfil e horário)" (existe: `fila_eventos`). **No PDF acrescentei a mesma linha**, para os três ficarem iguais | T:241, P:133, F:189 |
| SSL do banco | "Dados armazenados em banco PostgreSQL com conexão SSL" / "PostgreSQL com conexão SSL" | "Conexão SSL com o banco prevista para o ambiente de produção (não verificada nesta versão)" | T:239, P:131, F:187 |
| HTTPS | "Tráfego protegido por HTTPS em ambiente de produção" / "HTTPS obrigatório em produção" | "HTTPS previsto para o ambiente de produção (depende da hospedagem)" | T:238, P:130, F:186 |
| Limite de login | "Limitação de tentativas de login (10 tentativas por IP a cada 15 minutos)" / "Rate limiting: 10 tentativas/15 min/IP" | "Limitação de tentativas de login: 10 tentativas por IP a cada 15 minutos em produção" | T:237, P:129, F:185 |
| Registros de autenticação | T: "... e registros de autenticação (tokens JWT com validade de 24 horas)."; P: "Registros JWT (24h)"; F: igual ao T | T e F: "... e tokens JWT com validade de 24 horas, não armazenados no servidor."; P: "Tokens JWT (24h), não armazenados no servidor" | T:167, P:81, F:144 |
| Exclusão de prontuários | "Cadastro, consulta, atualização e exclusão de prontuários de pacientes" | "Cadastro, consulta e atualização de prontuários de pacientes" (a P não tinha essa linha) | T:206, F:163 |
| Direitos do titular | lista de direitos da LGPD, sem ressalva | **lista mantida** + frase depois dela: "Nesta versão, as solicitações são atendidas pelo contato do responsável, sem funcionalidade automática no sistema." | T:294, P:172, F:216 |
| Aceite registrado | F: "A aceitação destes termos é registrada com data e hora no sistema." (T e P não tinham frase equivalente) | F: "A aceitação destes termos é registrada no navegador do usuário." | F:266 |
| Até 4 mensagens | "...até 4 mensagens anteriores da conversa." | "...até 4 mensagens anteriores da conversa, limite aplicado pela tela." (P: "(limite aplicado pela tela)") | T:260, P:146, F:198 |
| Contato / DPO | T e F: título "Contato e Encarregado (DPO)"; T: "...ou pelo e-mail do responsável pelo projeto" (nenhum e-mail aparecia) | título "Contato do responsável"; T: "...ou com o autor do projeto, identificado abaixo". Não afirma DPO designado; a P já era só "Contato" | T:334, F:245 |
| Última atualização | "Última atualização: junho/2026" | "Última atualização: novembro de 2026" | P:189 |
**Nada sobre a IA, os dados enviados e o nome do paciente mudou** além do item das 4 mensagens (o texto "O nome, o CPF, o RG, o telefone e o endereço não são enviados" continua nos três; um teste confere).

## 2. `.env.example` do backend
Acrescentados (comentados, como alternativa a `DATABASE_URL`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` (**sem senha**), `DB_NAME` e `SWAGGER_ENABLED` (com explicação). **Removidos:** `SUPABASE_URL`, `SUPABASE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e os comentários órfãos. Confirmei antes: essas variáveis só apareciam no próprio `.env.example` (backend, frontend, benchmark e scripts não as leem). Comentários novos explicam que `DATABASE_URL` tem prioridade sobre `DB_*`, que `ALLOWED_ORIGINS` só vale com `NODE_ENV=production`, e que o seed para com erro se faltar uma `SEED_*_SENHA`.

## 3. README
- **Raiz:** `git clone https://github.com/MikaelDiogo/HealthHub_Mono.git` e `cd HealthHub_Mono` (antes: `<url-do-repositorio>` e `Project_HealthHub`); tabela com `NODE_ENV`, `ALLOWED_ORIGINS` e `SWAGGER_ENABLED`; aviso de **reiniciar o backend** depois de editar o `.env`; o seed **para com erro** se faltar uma `SEED_*_SENHA`, os e-mails mudam com `SEED_*_EMAIL` e um usuário que já existe não é alterado; "TF01 a TF08" virou "TF01 a TF09"; "Onde estão os materiais do TCC" agora cita as rodadas 3 a 6, os relatórios (`RESULTADOS_PARA_TCC_4` na raiz; `_5`, `_6`, `_7` e `_8` em `evidencias_tcc/`) e as etiquetas; nova subseção **"Como abrir a versão da banca"**: `git fetch --tags` e `git switch --detach tcc-rodada-final-6`.
- **Backend (`Readme.md`):** aviso de reiniciar, prioridade de `DATABASE_URL`, tabela "Variáveis que mudam o comportamento" (cada linha conferida em `main.ts`, `auth.controller.ts`, `swagger.ts`, `typeorm.config.ts`, `data-source.ts`), erro do seed e e-mails.
- **Frontend (`Readme.md`):** **não alterado** (nenhuma menção a TF, rodadas, etiquetas ou nome de pasta desatualizados).

## 4. Testes
| | Antes (X2, rodada 5b) | Depois (clone limpo de X) |
|---|---|---|
| Backend | 350 | **350** (28 arquivos; código do backend não mudou) |
| Frontend | 126 | **145** (13 arquivos) |
| Builds (`nest build`, `vite build`), `tsc -b`, prova do build da tabela CID | ok | ok |
| Varredura de segredos no clone | 0 | 0 (ver nota 1 da seção 7) |

**`textosLegais.spec.ts`:** os 5 testes antigos (trava contra "nascimento" etc.) **foram mantidos e passam**; acrescentei **19** (agora são 24). **Testes antigos alterados: nenhum** (então não há "esperado antigo/novo" a listar). Os novos:
- **Falham se voltar** (nos três textos): `Zod`, `Logs de auditoria`, "registros de autenticação", "exclusão de prontuários", "e-mail do responsável" e "Encarregado". O PDF aceita as duas grafias (com e sem acento).
- **Falha** se o aceite for descrito como "registrado... no sistema"; o PDF deve dizer "registrada no navegador do usuario".
- **Positivos** (cada texto): `class-validator`, "não armazenados no servidor", "limite aplicado pela tela", "Registro de eventos da esteira (autor, perfil e horário)", as frases de HTTPS, SSL e 10 tentativas, e a frase dos direitos do titular; a Política diz "novembro de 2026" e não "junho/2026"; Termos e PDF trazem "Contato do responsável".
- **IA inalterada:** "o nome, o CPF, o RG, o telefone e o endereço não são enviados" continua nos três textos.

## 5. Verificação pela tela (clone limpo de X, banco novo `healthhub_test_r7`, 11 migrações)
Script `evidencias_tcc/scripts_verificacao/capturas_rodada6.mjs` (médico, primeiro acesso): abriu o **modal de termos**, a **página da Política** e **gerou o PDF** (texto extraído com `pdftotext`) e conferiu **cada item do Passo 1 nos três textos**: **50 de 50 verificações OK, 0 falhas** (`capturas/conferencia_textos.md` e `.json`: 7 frases antigas que devem estar ausentes e 12 novas que devem estar presentes, por texto (19 linhas, 50 células verificadas, pois algumas frases só se aplicam a um ou dois dos três textos)). Conferi também **visualmente** as capturas: segurança no modal (`modal_seguranca_r6.png`), direitos e contato (`modal_direitos_contato_r6.png`, `modal_contato_r6.png`), segurança na página da Política (`politica_pagina_seguranca_r6.png`) e o trecho da IA (`fig29`).
**Figuras refeitas, e por quê:**
| Figura | Refeita? | Motivo |
|---|---|---|
| **29** (trecho do termo sobre a IA) | **Sim** → `capturas/fig29_termos_ia_r6.png` | o trecho capturado mudou: agora traz "até 4 mensagens anteriores da conversa, **limite aplicado pela tela**". Mesmo recorte da rodada 4 |
| **30** (1ª página do PDF) | **Sim** → `capturas/fig30_politica_pdf_pag1_r6.png` | a 1ª página mudou: "Dados de acesso dos profissionais" agora diz "tokens JWT com validade de 24 horas, **nao armazenados no servidor**" (antes "registros de autenticacao"); a data de geração também é outra |
Manifesto: `capturas/figuras_manifesto.csv`. Os arquivos de texto bruto do modal, da página e do PDF, e o PDF gerado, **não entram** no repositório nem no ZIP (levam o crédito do autor, decisão antiga); a tabela de conferência os resume.

## 6. Item adicional do autor
O espaço "Item adicional do autor" do pedido estava **vazio**; nada foi feito.

## 7. Divergências, limites e pendências
1. **Senha de desenvolvimento do Docker:** `healthhub2026` continua escrita nos README (raiz e backend) e no `docker-compose.yml`, em repositório **público**. Não mudou (fora do escopo do pedido); a varredura de segredos só a acusa por isso. É a senha do banco Docker local; não use em ambiente real.
2. **Texto sobre a IA que continua inexato (proibido mexer):** os três textos ainda listam "Histórico de conversas clínicas com o assistente de IA e transcrições de áudio" como dados tratados, mas o backend **não guarda** a conversa nem a transcrição (auditoria de 25/11/2026, contradição 3 dos dados).
3. **Direitos do titular:** a lista (portabilidade, eliminação, anonimização) foi **mantida**, como o pedido mandou, e ganhou a ressalva de que não há funcionalidade automática. Continua sem funcionalidade para eles.
4. **Contato:** além de tirar a promessa do e-mail, reescrevi a frase do T como "ou com o autor do projeto, identificado abaixo" (o pedido só mandava remover a promessa).
5. **Aceite do termo:** só o PDF tinha a frase; T e P não têm frase equivalente, então só o PDF mudou nesse item. O aceite continua guardado só no navegador.
6. **Os três textos ainda diferem entre si** em itens fora da lista do pedido (por exemplo, a Política não tem as seções de retenção e responsabilidades). O pedido mandava igualar só as frases listadas.
7. **`.env.example`:** o `DATABASE_URL` de exemplo continua ativo; quem copia o exemplo e só preenche `DB_*` continua usando o `DATABASE_URL` de exemplo (tem prioridade). Documentei o aviso, não mudei o valor.
8. **Não alterado (fora do escopo):** WebSockets aceitam qualquer origem (`cors: { origin: true }`); o aceite dos termos não é gravado no servidor; os 4 defeitos de baixa gravidade da revisão da rodada 5 (hífen não separável em intervalo de CID, mensagens de erro do chat voltando ao histórico etc.).
9. O README cita `tcc-rodada-final-6`, a pasta `rodada_final_6/` e este relatório: foram criados ao final desta rodada.
10. Nenhuma chamada à Groq. A verificação pela tela usou a API local sem chave de IA.
