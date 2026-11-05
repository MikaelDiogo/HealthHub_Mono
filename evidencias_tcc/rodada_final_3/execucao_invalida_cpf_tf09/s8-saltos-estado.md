# S8 — saltos de estado (comportamento OBSERVADO) — 2026-11-05T15:12:01.906Z — versão fcd4891

P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)
HTTP 200
corpo: {"id":"c15de0a2-e74a-4891-900d-60c7e7c2c49c","paciente_id":"e8a8d591-1d8c-4766-92b2-a92ce000fdb9","nome":"P8 Fictício S8","idade":40,"senha":"PR-001","chegada":"08:00 (05/11/2026, 12:12)","status":"Em Observação","gravidade":null,"created_at":"2026-11-05T15:12:01.937Z"}
status depois: Em Observação

Observação: o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.
