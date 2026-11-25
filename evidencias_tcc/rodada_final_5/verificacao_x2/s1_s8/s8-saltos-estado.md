# S8 — saltos de estado (comportamento OBSERVADO) — 2026-11-25T01:28:16.576Z — versão d745136

P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)
HTTP 200
corpo: {"id":"fb0b93d0-3dd1-4ac4-9764-78886ca81824","paciente_id":"3fa96082-ca16-45ae-bcd1-7bb288fa16ff","nome":"P8 Fictício S8","idade":40,"senha":"PR-001","chegada":"08:00 (24/11/2026, 22:28)","status":"Em Observação","gravidade":null,"created_at":"2026-11-25T01:28:16.620Z"}
status depois: Em Observação

Observação: o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.
