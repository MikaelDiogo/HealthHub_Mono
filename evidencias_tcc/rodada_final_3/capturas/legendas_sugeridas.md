# Legendas sugeridas (uma frase por captura)

Os números 19, 20 e 30 são os da "figura atual do TCC" informados no pedido da rodada 3. Todas as capturas: 1280 × 800, tema claro, perfil indicado, pacientes fictícios (TESTE C a K), IA simulada.

| Arquivo | Legenda sugerida |
|---|---|
| `fig19_painel.png` | Figura 19 (parte 1) - Painel do médico com os indicadores e a esteira agora. |
| `fig19b_painel_atencao_agora.png` | Figura 19 (parte 2) - Lista "atenção agora" com os motivos críticos, agora incluindo a pressão arterial (PA 190/120 e PA 85/50) e a temperatura de 39,1 °C. |
| `fig20_historico_sinais.png` | Figura 20 - Paciente em foco com o cartão Pressão arterial e o histórico de sinais vitais. |
| `fig30_painel_atencao_f14.png` | Figura 30 - Painel no cenário de fronteira F14: paciente com SpO₂ 92%, 38,5 °C e FC 88 permanece em Atenção. |
| `novo11_pa_critica_painel.png` | Figura nova - Paciente em foco com pressão arterial 190/120 mmHg, classificado como Crítico. |
| `novo12a_pa_normal_130-85.png` | Figura nova (a) - Pressão arterial 130/85 mmHg classificada como Normal. |
| `novo12b_pa_atencao_150-95.png` | Figura nova (b) - Pressão arterial 150/95 mmHg classificada como Atenção. |
| `novo12c_pa_critica_85-50.png` | Figura nova (c) - Pressão arterial 85/50 mmHg classificada como Crítico. |
| `novo13a_temperatura_39-1_critico.png` | Figura nova (a) - Temperatura de 39,1 °C, o limiar do nível Crítico. |
| `novo13b_temperatura_39-0_atencao.png` | Figura nova (b) - Temperatura de 39,0 °C, ainda no nível Atenção. |

## Figuras que NÃO precisaram ser refeitas
O prontuário em PDF e a guia de alta usam cores fixas por rótulo (não por limiar); os cartões da esteira mostram só a cor da classificação de risco (Manchester adaptada), sem cor por limiar de sinal vital. Conferido no código (`ExportPDF/index.tsx`, `Alerts/index.tsx`). Por isso as figuras 13, 22 e 29 do pedido não mudam por causa dos limiares. As figuras da rodada 2 que mostravam painel com temperatura 38,6 °C como motivo crítico (rodada_final_2: fig16b e fig22) ficam **desatualizadas**: use as desta rodada.
