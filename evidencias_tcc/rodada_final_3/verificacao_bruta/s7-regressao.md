# S7 — regressão (checagens pela API; IA simulada) — 2026-11-05T15:13:40.924Z — versão 5dfd8fc

- [x] Admissão pela API: entrada criada com senha PR-NNN gerada pelo servidor — senha PR-001
- [x] Sinais vitais críticos (FC 130, SpO₂ 90, 39,2 °C) entram na lista "atenção agora" do painel — SpO₂ 90% · FC 130 bpm · Temperatura 39.2 °C
- [x] Chat de IA responde (simulado) e NÃO atribui cor nem muda a esteira — HTTP 201; cor antes/depois: sem cor/sem cor
- [x] Alta pelo médico: sai da esteira e a visita fecha com desfecho — HTTP 204; visita: [{"desfecho":"Alta","risco":"Amarelo"}]
- [x] Alertas crítico/atenção/normal por valor: cobertos pelos testes unitários (vitalStatus.spec e calcular-metricas.spec); a conferência na fronteira exata está no TF05 — ver logs dos testes

APROVADO — 5/5 itens
