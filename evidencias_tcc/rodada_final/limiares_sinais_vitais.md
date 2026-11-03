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


## 5. Fonte localizada (busca de 03/11/2026) — POP do HC-UFTM

**O documento citado no TCC existe e é público:** POP.HC-UFTM-DENF.003, **"Rotina de Registro de Sinais Vitais e Controles", versão 6**, HC-UFTM/Ebserh, emitido em 14/11/2025, vigência de dois anos, 26 páginas, elaborado pela Divisão de Enfermagem.
Link: https://www.gov.br/hubrasil/pt-br/hospitais-universitarios/regiao-sudeste/hc-uftm/documentos/procedimentos-e-rotinas-operacionais-padrao/pops/POP.HCUFTMDENF.003RotinadeRegistrodeSinaisVitaiseControlesversao6.pdf
(O PDF não foi copiado para o repositório; só o link e os valores abaixo, lidos do texto extraído do PDF. **Confira os números diretamente nas páginas indicadas:** a extração de tabelas pode embaralhar colunas, e a linha de frequência cardíaca da escala NEWS 2 (Anexo A) veio visivelmente embaralhada, por isso não a uso.)

**O que o POP diz (sem extrapolar):**
- Os sinais vitais de rotina são temperatura, pulso/FC, PA, FR, dor e SpO₂; o registro pode ser guiado pela escala **NEWS** (adultos), PEWS (pediátrico) e MEOWS (gestantes), e a escala **"é um complemento ao julgamento clínico. Não se sobrepõe."**
- O POP descreve **valores de referência** (anexos D a H) e a escala **NEWS 2** (Anexo A, fonte citada: Instituto Nacional de Tecnologia e Saúde, 2023). Ele é um procedimento de enfermagem para **pacientes internados**, não um protocolo de triagem na chegada.

**Comparação com o que o sistema faz hoje (apenas descritiva; nenhum valor foi alterado):**

| Sinal | Sistema hoje | O que o POP traz | Coincidência |
|---|---|---|---|
| Frequência cardíaca (adulto) | crítico `>100` ou `<60`; atenção `>90` | Anexo E (fonte: Gomes, 2018): adulto 60–100 bpm; bradicardia `<60`; taquicardia `>100` | Os limites 60 e 100 coincidem com bradicardia/taquicardia. O POP não usa a palavra "crítico". **`>90` como atenção não aparece para adultos** (90 é o limite superior da faixa de adolescente). |
| SpO₂ | atenção `<95`; crítico `<92` | Anexo H (fonte: Maciel et al., 2017): normal 95–100; hipóxia leve 91–94; moderada 86–90; severa abaixo de 86. NEWS 2, escala 1 (Anexo A): ≤91 = 3 pontos; 92–93 = 2; 94–95 = 1; ≥96 = 0 | `<95` coincide com o fim da faixa normal; `<92` coincide com "≤91" do NEWS 2 (3 pontos), mas no Anexo H o 91 cai em "hipóxia leve". |
| Temperatura | atenção `>=37,8`; crítico `>38,5` | Anexo F (fontes: SBP 2025; Brasil 2023; UpToDate 2024): normotermia 36,0–37,2; estado febril 37,3–37,7; febre baixa 37,8–38,0; febre moderada 38,1–39,0; febre alta 39,1–40,0; hiperpirexia ≥40,1. NEWS 2: 36,1–38,0 = 0; 38,1–39 = 1; ≥39,1 = 2 | `>=37,8` coincide com o início de "febre baixa". **`38,5` não aparece** no POP nem no NEWS 2 (eles usam 38,1 e 39,1). |
| Pressão arterial | sem limiar | Anexo D (fonte: SBC 2025) traz a classificação da pressão (normal `<120/<80` até hipertensão grave); NEWS 2 pontua a pressão sistólica; PAM normal 70–105 mmHg | Há base documental para definir limiares de pressão, se o autor quiser (escolha dele, com apoio profissional). |

**Limites desta fonte para o HealthHub:** é um POP de internação (enfermaria), não de triagem; não define "crítico" e "atenção" como o sistema define; a escolha entre manter alertas simples, adotar o NEWS 2 ou usar só os valores de referência é uma **decisão clínica do autor/orientador**, não minha. A adaptação do NEWS 2 para o Brasil aparece na busca ainda como projeto/coorte (PUCRS), sem validação concluída encontrada.
