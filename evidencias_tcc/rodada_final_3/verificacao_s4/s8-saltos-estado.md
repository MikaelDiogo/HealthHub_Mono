# S8 — saltos de estado (comportamento OBSERVADO) — 2026-11-05T17:06:39.306Z — versão 0dd2303

P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)
HTTP 200
corpo: {"id":"e5282630-7e77-4db3-ac65-eac492c2b7d0","paciente_id":"9ba28e7f-322a-48a6-9c79-fbdf671f6a1c","nome":"P8 Fictício S8","idade":40,"senha":"PR-001","chegada":"08:00 (05/11/2026, 14:06)","status":"Em Observação","gravidade":null,"created_at":"2026-11-05T17:06:39.326Z"}
status depois: Em Observação

Observação: o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.
