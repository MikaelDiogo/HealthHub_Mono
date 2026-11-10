# S8 — saltos de estado (comportamento OBSERVADO) — 2026-11-10T14:37:47.629Z — versão 4714bb1

P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)
HTTP 200
corpo: {"id":"a8c722d2-4daf-4e82-a845-d5604f89bc8f","paciente_id":"dbee5ccc-e479-40a6-b724-1ced7502e685","nome":"P8 Fictício S8","idade":40,"senha":"PR-001","chegada":"08:00 (10/11/2026, 11:37)","status":"Em Observação","gravidade":null,"created_at":"2026-11-10T14:37:47.657Z"}
status depois: Em Observação

Observação: o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.
