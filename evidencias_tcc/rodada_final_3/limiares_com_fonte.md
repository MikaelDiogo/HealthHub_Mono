# Limiares com fonte (rodada 3): índice

Arquivos desta pasta: `limiares/tabela_limiares.csv`, `limiares/regras_alerta.md` (a regra completa, copiada abaixo), `limiares/fontes_limiares.md`.

# Regras de alerta de sinais vitais (rodada 3, 05/11/2026)

Os números abaixo vêm de documentos citados em `fontes_limiares.md`; **não foram escolhidos pelo desenvolvedor**. Os rótulos "atenção" e "crítico" são uma **convenção do projeto**: as fontes usam categorias e pontos próprios, e o campo `fonte` documenta de onde vem o **número**, não o rótulo.

| Sinal | Atenção | Crítico |
|---|---|---|
| Frequência cardíaca (bpm) | `> 90` | `< 60` ou `> 100` |
| SpO₂ (%) | `< 95` | `< 92` |
| Temperatura (°C) | `>= 37,8` | `>= 39,1` |
| Pressão arterial (mmHg) | PAS de 91 a 100, **ou** PAS `>= 140`, **ou** PAD `>= 90` | PAS `<= 90`, **ou** PAS `>= 180`, **ou** PAD `>= 120` |

PAS = pressão sistólica; PAD = diastólica.

## Como o nível é decidido
- O nível do paciente é o **pior** entre os sinais: **crítico vence atenção**. O "Estado geral" do painel é o pior dos sinais.
- Valor ausente ou `<= 0` é **desconhecido** (sem alerta).
- A lista "atenção agora" do painel (backend) usa **só o nível crítico**; o painel do paciente em foco (frontend) mostra os dois níveis.

## Formato aceito da pressão arterial
A pressão continua sendo **texto livre** (coluna `varchar`, sem migração). Ela só vale se casar com `^\s*(\d{2,3})\s*[/xX]\s*(\d{2,3})\s*$`, com PAS e PAD de **30 a 300**.

| Texto digitado | Leitura |
|---|---|
| `120/80`, `120x80`, `120X80`, `120 / 80`, ` 90/60 ` | válida (PAS/PAD) |
| `90`, `abc`, `120/`, `/80`, vazio | desconhecida: sem alerta, sem erro |
| `300/20`, `29/80`, `1200/80` | desconhecida (fora de 30 a 300 ou mais de 3 dígitos) |

Exemplos: `90/60` crítico; `91/60` e `100/60` atenção; `101/70` e `139/89` normal; `140/80`, `120/90` e `179/119` atenção; `180/80`, `120/120` e `220/130` crítico. Temperatura: 37,7 normal; 37,8 atenção; 39,0 atenção; 39,1 crítico. FC: 59 crítico; 60 a 90 normal; 91 a 100 atenção; 101 crítico. SpO₂: 91 crítico; 92 a 94 atenção; 95 e 96 normal.

## Observações já decididas (registradas, não "harmonizadas")
1. **Rótulos:** ver acima (convenção do projeto).
2. **SpO₂ < 95 (atenção):** coincide exatamente com o POP (normal de 95 a 100%). O NEWS2 pontua também 95% (faixa 94 a 95), então o corte do HealthHub é um pouco mais estrito que o do NEWS2. A fonte principal é o POP.
3. **Crise hipertensiva (crítico):** usamos `PAS >= 180 ou PAD >= 120`, a redação do Posicionamento da SBC. A Linha de cuidado do Ministério da Saúde escreve "superior a 180 mmHg e ... superior a 120 mmHg" (`>` e `e`), e a tabela do POP, ">180 e/ou >120". São variações de redação do mesmo conceito; as três ficam registradas em `fonte_pressao_critica` nos arquivos de configuração. A própria SBC avisa que o número é **conceitual**, serve como parâmetro de conduta e **não deve ser usado como critério absoluto**: o que define a emergência é a lesão de órgão-alvo.
4. **Hipertensão (atenção):** a diretriz exige medidas repetidas para o diagnóstico. O alerta do HealthHub reage a **uma** leitura e significa **"pressão elevada"**, e **não** "hipertensão diagnosticada".
5. **PAS ≤ 90 como crítico:** no NEWS2 vale 3 pontos (o máximo). O corte `<= 90` inclui o 90.
6. **Anexo D do POP:** o texto extraído do PDF tem colunas trocadas. Para a pressão valem o NEWS2, a Diretriz 2020, o Posicionamento da SBC e a Linha de cuidado; o Anexo D é apoio.

## Chave `ALERTAS_SEM_FONTE` / `VITE_ALERTAS_SEM_FONTE`
O mecanismo permanece (padrão `true`; `false` desliga só limiares com `fonte: null`), mas **hoje nenhum limiar tem `fonte: null`**: a chave **não desliga nenhum alerta real**. Os testes usam um limiar sintético para provar o mecanismo.

## Limites
Não é validação clínica: um alerta é um aviso de apoio; a decisão é do profissional. As faixas de recusa do servidor (FC 0 a 300, SpO₂ 0 a 100, temperatura 25 a 45, PA até 20 caracteres) não mudaram.
