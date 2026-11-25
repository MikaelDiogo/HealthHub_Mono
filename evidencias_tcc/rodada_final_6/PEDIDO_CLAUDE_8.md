# Pedido ao Claude Code — rodada 6 (alinhar textos legais, README e .env.example ao código)

Projeto: HealthHub. Parta da etiqueta publicada `tcc-rodada-final-5` (commit `6a78645157b1f92eb7b86593ee196b535a38ecb8`), na branch `evolucao-estrutura`. Crie a etiqueta `pre-rodada6` e a branch `rodada6-textos`.
Responda em português. Não invente resultado: o que não puder conferir, escreva "não conferido".

## Objetivo
A auditoria de 25/11/2026 mostrou que os textos legais do aplicativo prometem controles que o código não implementa. **Corrija os textos, não o comportamento.** Nenhuma regra de negócio, rota, permissão, limite ou chamada à IA pode mudar.

## Regras
1. **Escopo fechado:** só `HealthHub-Project/src/components/TermosUsoModal/index.tsx`, `HealthHub-Project/src/pages/PoliticaDados/index.tsx`, `HealthHub-Project/src/utils/gerarPDFPolitica.ts`, `HealthHub-BackEnd/.env.example`, os README (raiz, backend e frontend), testes dos textos, docs e evidências. Antes de cada commit, `git diff --stat` deve mostrar só esses arquivos.
2. Nenhuma chamada real à Groq. Varredura de segredos antes de cada commit e no ZIP.
3. Não ajuste teste para passar; se um teste antigo mudar, liste esperado antigo e novo.

## Passo 1 — Textos legais (T = Termos, P = Política, F = PDF)
Ajuste as frases para dizer só o que o código faz, de forma igual nos três textos:
- **Zod (T:235, P:127, F:183):** trocar por "Validação dos dados de entrada no backend (class-validator), com lista de campos permitidos".
- **Logs de auditoria (T:241, P:133):** remover. Se quiser manter algo, só "Registro de eventos da esteira (autor, perfil e horário)", que existe.
- **SSL do banco (T:239, P:131, F:187):** "Conexão SSL com o banco prevista para o ambiente de produção (não verificada nesta versão)".
- **HTTPS (T:238, P:130, F:186):** "HTTPS previsto para o ambiente de produção (depende da hospedagem)".
- **Limite de login (T:237, P:129, F:185):** "10 tentativas por IP a cada 15 minutos em produção".
- **"Registros de autenticação" (T:167, P:81, F:144):** remover "registros de autenticação"; manter "tokens JWT com validade de 24 horas, não armazenados no servidor".
- **"Exclusão de prontuários" (T:206, F:163):** remover "exclusão" (não há rota DELETE de paciente).
- **Direitos do titular (T:278-285, P:158-163, F:206-212):** manter a lista de direitos da LGPD, mas acrescentar que, nesta versão, as solicitações são atendidas pelo contato do responsável, sem funcionalidade automática no sistema.
- **Aceite "registrado no sistema" (F:264):** "registrado no navegador do usuário".
- **"Até 4 mensagens anteriores" (T:260, P:146, F:197):** "até 4 mensagens anteriores, limite aplicado pela tela".
- **Contato/DPO (T:331-342, F:243-247):** remover a promessa de "e-mail do responsável" se nenhum e-mail aparece; não afirmar DPO designado.
- **"Última atualização" (P:186):** trocar para "novembro de 2026".
Nada sobre a IA, os dados enviados e o nome do paciente pode mudar além do item das 4 mensagens. A trava contra "nascimento" (`textosLegais.spec.ts`) deve continuar passando; acrescente um teste que falhe se "Zod" ou "Logs de auditoria" reaparecerem nos três textos.

## Passo 2 — `.env.example` do backend
Acrescentar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` (comentados, como alternativa a `DATABASE_URL`) e `SWAGGER_ENABLED`. Remover `SUPABASE_URL`, `SUPABASE_KEY`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, se o código realmente não os ler (confirme no backend e no frontend antes).

## Passo 3 — README
- Raiz: corrigir `cd Project_HealthHub` para o nome real da pasta clonada (`HealthHub_Mono`) e trocar `<url-do-repositorio>` pela URL pública.
- Explicar `NODE_ENV`, `ALLOWED_ORIGINS` e `SWAGGER_ENABLED`; dizer que, depois de editar o `.env`, é preciso **reiniciar o backend**; dizer que o seed para com erro se faltar uma `SEED_*_SENHA` e que os e-mails mudam com `SEED_*_EMAIL`.
- Seção "Onde estão os materiais do TCC": incluir as rodadas 3 a 5, os relatórios de resultado e as etiquetas; acrescentar **como abrir a versão da banca**: `git fetch --tags` e `git switch --detach tcc-rodada-final-6`.
- Atualizar "TF01 a TF08" para "TF01 a TF09".

## Passo 4 — Verificação
Em clone novo do commit do código (X): builds, **todos os testes** (contagens de backend e frontend), varredura de segredos. Como só textos mudaram, refaça pela tela apenas: abrir o modal de termos, a página da Política e gerar o PDF, e confirmar visualmente os itens do Passo 1. Refaça a **Figura 29** (trecho do termo sobre IA) e a **Figura 30** (topo do PDF) **somente se a parte capturada mudou**; informe.

## Passo 5 — Versão final única e pacote
Commit X (código e docs), commit Y (só `evidencias_tcc/`), `git diff --stat X Y -- . ':!evidencias_tcc' ':!docs'` vazio, etiqueta anotada `tcc-rodada-final-6` em Y, merge fast-forward em `evolucao-estrutura`, push e `git ls-remote`. Gere `HealthHub_pacote_TCC_rodada6.zip` com `LEIAME.txt` (hashes, etiqueta, INCOMPLETO no topo se algo falhar) e `RESULTADOS_PARA_TCC_8.md` (antes e depois de cada frase alterada, arquivos, testes, contagens, figuras refeitas ou não, divergências).

## Item adicional do autor
(espaço para o que você quiser unir a esta rodada)