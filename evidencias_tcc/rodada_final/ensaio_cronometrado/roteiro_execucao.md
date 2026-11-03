# Roteiro de execução do ensaio cronometrado (papel × HealthHub)

Ensaio **exploratório, feito pelo próprio desenvolvedor**, com viés de familiaridade; **não estima satisfação de usuários nem demonstra redução de tempo para enfermeiros**. Pacientes 100% fictícios. Não alterar o relógio do servidor. Não preencher tempos estimados nem usar tempos de automação como tempo humano.

## Antes de começar
1. Preencha em `casos_fonte.csv` os dados em branco (idade, sexo, motivo, sinais vitais artificiais) **copiando do Apêndice A do TCC**; rode `node gerar_instrumentos.mjs` de novo e imprima `cartoes_caso.html` (um por página) e `formulario_papel.html` (imprima 17 cópias, ou reaproveite a ficha).
2. Suba o sistema local com banco de teste isolado e dados fictícios (sem a IA real).
3. **Tentativa de familiarização:** uma execução em papel e uma no sistema, **fora do cálculo** (linhas `(familiarizacao)` da planilha).

## A cada execução (sistema limpo)
- Antes de **cada repetição** do sistema, deixe o sistema limpo: `node reiniciar_sistema_limpo.mjs` (apaga fila e pacientes FICTÍCIO-* do banco de teste).
- **Papel:** do momento em que o cartão é apresentado até a ficha preenchida e conferida.
- **Sistema:** do momento em que o cartão é apresentado até a confirmação do registro (cadastro, sinais vitais e cor escolhida pelo enfermeiro).
- Registre na `coleta_ensaio.csv`: início, fim, tempo em segundos, se os campos obrigatórios ficaram completos (sim/não, conferidos campo a campo contra o cartão), erros de digitação ou omissões, falhas, se precisou de ajuda e observações. Preserve **todas** as tentativas (inclusive as ruins); se repetir uma execução, registre as duas e declare a regra de análise **antes**.
- Igualdade da categoria artificial comprova só fidelidade de registro, não acurácia clínica.

## Ordem alternada (primeira modalidade → segunda), 3 repetições
| Repetição | Caso | Ordem |
|---|---|---|
| 1 | FICTÍCIO-01 | papel → sistema |
| 1 | FICTÍCIO-02 | sistema → papel |
| 1 | FICTÍCIO-03 | papel → sistema |
| 1 | FICTÍCIO-04 | sistema → papel |
| 1 | FICTÍCIO-05 | papel → sistema |
| 2 | FICTÍCIO-01 | sistema → papel |
| 2 | FICTÍCIO-02 | papel → sistema |
| 2 | FICTÍCIO-03 | sistema → papel |
| 2 | FICTÍCIO-04 | papel → sistema |
| 2 | FICTÍCIO-05 | sistema → papel |
| 3 | FICTÍCIO-01 | papel → sistema |
| 3 | FICTÍCIO-02 | sistema → papel |
| 3 | FICTÍCIO-03 | papel → sistema |
| 3 | FICTÍCIO-04 | sistema → papel |
| 3 | FICTÍCIO-05 | papel → sistema |

Com 3 repetições (número ímpar) a alternância não fica perfeitamente balanceada por caso; se puder, faça 4 repetições (ajuste `REPS` em `gerar_instrumentos.mjs`).

## Ficha por execução (campos a guardar no relatório)
ID, requisito relacionado, versão (hash do commit), data, executor, pré-condição, entrada, esperado, obtido, duração, resultado, evidência, falha e correção.

## Depois
Entregue a `coleta_ensaio.csv` preenchida e rode `node analisar_ensaio.mjs` (estatísticas, tabela e gráfico; sem afirmar significância estatística).
