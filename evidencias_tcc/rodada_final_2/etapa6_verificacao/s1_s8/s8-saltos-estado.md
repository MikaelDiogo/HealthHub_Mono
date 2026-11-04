# S8 — saltos de estado (comportamento OBSERVADO) — 2026-11-04T12:35:40.817Z — versão 98b375d

P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)
HTTP 200
corpo: {"id":"5d4ff69d-504e-4338-80c5-4581158508ac","paciente_id":"1b26acca-d6d6-467d-aa59-490f8c1808e6","nome":"P8 Fictício S8","idade":40,"senha":"PR-001","chegada":"08:00 (04/11/2026, 09:35)","status":"Em Observação","gravidade":null,"created_at":"2026-11-04T12:35:40.847Z"}
status depois: Em Observação

Observação: o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.
