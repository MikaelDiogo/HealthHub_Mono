# Evidências anteriores à mudança do cadastro (04/11/2026)

Em 04/11/2026 o cadastro de paciente mudou (commit `b0351da`, branch `evolucao-estrutura`):

| Antes | Depois |
|---|---|
| Nome, CPF, idade e sexo obrigatórios | **Só o nome é obrigatório**; CPF, RG, idade, sexo, telefone, endereço, alergias, medicamentos e anamnese são opcionais |
| Sexo digitado em campo de texto (`M`, `F` ou `Outro`) | Sexo em **lista** (Masculino/Feminino, com opção de limpar); grava `M`/`F`; valores antigos (inclusive "Outro") continuam sendo exibidos |
| Texto "Cadastro mínimo: nome, CPF, idade e sexo são obrigatórios" e "Informe nome completo, CPF (11 dígitos), idade e sexo (M, F ou Outro)" | "Só o nome é obrigatório. Se não souber o nome, marque 'Nome desconhecido'" |
| Sem opção para paciente sem identificação | **"Nome desconhecido"** grava "Paciente não identificado (#xxxx)" e marca o paciente como **nome provisório**; o nome pode ser corrigido depois |

Os arquivos abaixo **foram produzidos antes** dessa mudança e **não foram editados**: são o registro do que o sistema fazia na época. Não use as imagens para ilustrar o cadastro atual (as figuras novas estão em `rodada_final_2/`).

## Imagens que mostram o cadastro com a regra antiga
- `rodada_final/cenarios22/prints/F02_tela1.png`, `F02_vazio.png`, `F02_preenchido.png`, `F02_resultado.png` (cenário F02, formulário de cadastro com o texto antigo e Sexo como campo de texto)
- `rodada_final/cenarios22/prints/F17_cadastro1.png`, `F17_cadastro2_apos_recarregar.png` (cenário F17, cadastro com os campos antigos)
- Capturas antigas de telas de cadastro em `evidencias_testes_2026-10-29/` (pasta fora do repositório, se existir no seu computador)

## Textos e resultados que citam a regra antiga
- `rodada_final/cenarios22/resultados.json` e `execucao_cenarios.log` (execuções 1 e 2 dos 22 cenários, ambas anteriores à mudança)
- `rodada_final/cenarios22_execucao1/` (execução 1, preservada por decisão do autor)
- `09_historico.md` (histórico das correções: a linha do F02 descreve "cadastro vazio sem aviso, texto 'todos opcionais'")
- `rodada_final/tf/tf_resultados.json` e `t_tf_execucao.log` (TF01 executado com CPF, idade e sexo; o script `tf/tf_casos.mjs` já foi ajustado e o TF01 passa a usar só o nome; os resultados novos estão em `rodada_final_2/`)
- `RESULTADOS_PARA_TCC.md` (a rodada 1 descreve o cadastro com os quatro campos; a rodada 2 está em `RESULTADOS_PARA_TCC_2.md`)

## Instrumentos do ensaio cronometrado (papel × HealthHub, 03/11/2026)
`rodada_final/ensaio_cronometrado/cartoes_caso.html`, `formulario_papel.html`, `casos_fonte.csv` e `gerar_instrumentos.mjs` foram **mantidos como foram usados** nas 30 medições: o cartão e a ficha de papel tinham nome, CPF, idade, sexo, horário e motivo, e o sistema foi cronometrado com o cadastro completo da época. Alterá-los agora tornaria a evidência inconsistente com o ensaio já medido. Um novo ensaio, se houver, deve partir do cadastro mínimo.

## Scripts
Os scripts de verificação foram ajustados à regra nova (em `rodada_final/runner_atualizado/` e `rodada_final/tf/`; cópias versionadas em `scripts_verificacao/`): o campo Sexo passou a ser escolhido na lista (`escolherSexo` em `lib.mjs`), o F02 aceita o aviso no campo Nome e o TF01 cadastra só com o nome. Os ajustes estão listados no `RESULTADOS_PARA_TCC_2.md`.
