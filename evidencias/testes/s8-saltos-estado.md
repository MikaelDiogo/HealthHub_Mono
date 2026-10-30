# S8 — Saltos de estado (comportamento observado; sem critério de aprovado/reprovado)

Ambiente: banco de teste isolado, API local, paciente fictício P8. Log bruto: `s8-bruto.log`. Execução: `cenarios_accr.mjs s8`, 30/10/2026 (17:37 UTC).

Passos e resultado real:
1. P8 admitido com status "Aguardando Triagem".
2. Enfermeiro enviou `PUT /fila/:id` com `status: "Em Observação"` (pulando "Em Triagem" e "Aguardando Atendimento") → **HTTP 200, salto aceito**; a fila passou a mostrar "Em Observação".
3. (Extra) Médico voltou a entrada para "Aguardando Triagem" → HTTP 200, também aceito.
Só a API foi usada; o salto não foi tentado pela interface.

Achado/limitação a declarar: o sistema não restringe transições entre estados da esteira; regra de transição não decidida (ver `HealthHub-BackEnd/src/modules/fila/domain/fila-valores.ts`). Não foi inventado nenhum bloqueio.
