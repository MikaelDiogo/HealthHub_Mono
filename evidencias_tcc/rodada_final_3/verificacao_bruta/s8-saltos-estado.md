# S8 — saltos de estado (comportamento OBSERVADO) — 2026-11-05T15:13:42.328Z — versão 5dfd8fc

P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)
HTTP 200
corpo: {"id":"8508d837-cac4-44d4-8282-23ec5608d04d","paciente_id":"a94fc9cd-421e-4a5d-8396-1d37d1d248f2","nome":"P8 Fictício S8","idade":40,"senha":"PR-001","chegada":"08:00 (05/11/2026, 12:13)","status":"Em Observação","gravidade":null,"created_at":"2026-11-05T15:13:42.343Z"}
status depois: Em Observação

Observação: o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.
