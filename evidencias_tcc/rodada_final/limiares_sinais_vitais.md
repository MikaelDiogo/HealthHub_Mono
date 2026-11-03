# Limiares de alerta de sinais vitais — levantamento (Tarefa 8)

Levantado em 03/11/2026 sobre o commit `05e5823` (branch `evolucao-estrutura`). **Nenhum valor foi alterado e nenhum valor clínico foi escolhido ou inferido por mim.** A tabela só descreve o que o código faz hoje.

## 1. Limiares de alerta (o que muda a cor/estado na tela e a lista "atenção")

| Sinal | Estado | Regra atual | Onde está no código | Fonte registrada? |
|---|---|---|---|---|
| SpO₂ | crítico | `< 92` | `HealthHub-Project/src/utils/vitalStatus.ts` (`getVitalStatus`, linha 19; `spo2Status`, linha 62) e `HealthHub-BackEnd/src/modules/metricas/application/calcular-metricas.ts` (`motivoCritico`, linha 67) | **Não** |
| SpO₂ | atenção | `< 95` | `vitalStatus.ts` (linha 25; `spo2Status`, linha 63) | **Não** |
| Frequência cardíaca | crítico | `> 100` ou `< 60` | `vitalStatus.ts` (linha 20; `fcStatus`, linha 69) e `calcular-metricas.ts` (linha 68) | **Não** |
| Frequência cardíaca | atenção | `> 90` | `vitalStatus.ts` (linha 26; `fcStatus`, linha 70) | **Não** |
| Temperatura | crítico | `> 38,5 °C` | `vitalStatus.ts` (linha 21; `tempStatus`, linha 75) e `calcular-metricas.ts` (linha 69) | **Não** |
| Temperatura | atenção | `>= 37,8 °C` | `vitalStatus.ts` (linha 27; `tempStatus`, linha 77) | **Não** |
| Pressão arterial | — | **nenhum limiar, nenhum alerta** | campo texto livre (`varchar(20)`, ex.: `120/80`); `CreateSinaisVitaisDto.pressao_arterial` só limita o tamanho | — |

Regra comum: valor `<= 0` (ou ausente) é tratado como "não informado" e não gera alerta. O estado geral do paciente é o pior entre os três sinais.

## 2. Faixas de recusa na validação (o servidor rejeita o registro; não são alertas)

| Campo | Faixa aceita | Onde | Fonte registrada? |
|---|---|---|---|
| Frequência cardíaca | inteiro de 0 a 300 bpm | `HealthHub-BackEnd/src/modules/sinais-vitais/presentation/dtos/create-sinais-vitais.dto.ts` | Não |
| SpO₂ | 0 a 100 % | idem | Não |
| Temperatura | 25 a 45 °C | idem | Não |
| Pressão arterial | até 20 caracteres, texto | idem | — |

O formulário do frontend não tem faixa própria (a recusa vem do servidor e a mensagem aparece na tela, como o cenário F04 mostrou com 46 °C).

## 3. Observações do levantamento
- **Nenhuma fonte clínica está registrada** em comentários, testes ou documentos do repositório para esses valores. O teste `vitalStatus.spec.ts` diz apenas "Limiares exigidos: SpO2 < 95%, FC < 60 ou > 100, temperatura >= 37,8 °C" (sem dizer quem exigiu nem em que documento), e `create-sinais-vitais.service.spec.ts` registra que o valor clínico dos limites tem "sem fonte clínica documentada".
- **A referência citada no TCC (rotina de registro de sinais vitais do HC-UFTM) não aparece** em nenhum arquivo do repositório (busca por `UFTM` no código, nos testes e nos `.md`: só a menção na lista de tarefas). Portanto não sei quais valores ela traz e **não extrapolei**.
- **Duplicação:** os limiares de "crítico" existem em **dois lugares** (frontend `vitalStatus.ts` e backend `calcular-metricas.ts`, este com o comentário "mesmos limiares do frontend"). Mudar um sem o outro faz a tela e a lista "atenção"/métricas divergirem. O backend não tem o nível "atenção".
- Sem pressão arterial estruturada não há como alertar por ela nem mostrá-la em gráfico.

## 4. As duas opções (branches separadas; a branch principal não foi alterada)

Escolha sua depois. Cada opção sai do commit do levantamento e **não muda nenhum valor de limiar**.
- **Opção A** — branch `limiares-opcao-a-pressao-estruturada`: limiares centralizados em um arquivo de configuração por sinal (cada um com campo `fonte`), campos estruturados `pressao_sistolica` e `pressao_diastolica` (migration, entidade, DTO), **sem limiar de pressão definido** até você informar valores e fonte.
- **Opção B** — branch `limiares-opcao-b-chave-de-alertas`: chave de configuração para **desligar os alertas** de sinais vitais sem fonte, mantendo o registro dos sinais (frontend e backend).
