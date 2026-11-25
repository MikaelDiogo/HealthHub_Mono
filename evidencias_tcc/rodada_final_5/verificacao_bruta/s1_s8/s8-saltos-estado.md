# S8 — saltos de estado (comportamento OBSERVADO) — 2026-11-25T00:36:08.089Z — versão 01e9b18

P8 admitido em "Aguardando Triagem". Enfermeiro → PUT /fila/:id { status: "Em Observação" } (pula Triagem, Atendimento e Consulta)
HTTP 200
corpo: {"id":"428f8d75-d8b7-45f1-96bf-67ca625ce738","paciente_id":"f9acffc2-783f-4dab-9ecf-1a4a5f6fd389","nome":"P8 Fictício S8","idade":40,"senha":"PR-001","chegada":"08:00 (24/11/2026, 21:36)","status":"Em Observação","gravidade":null,"created_at":"2026-11-25T00:36:08.118Z"}
status depois: Em Observação

Observação: o salto foi ACEITO: o sistema não restringe transições entre estados da esteira (regra de transição não decidida; ver fila-valores.ts). É um achado/limitação a declarar, não um critério de falha.
