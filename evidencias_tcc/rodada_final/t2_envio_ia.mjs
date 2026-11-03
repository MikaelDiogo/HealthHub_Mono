// Tarefa 2 — confere o que "sai" para o provedor (mock registra o corpo). Paciente fictício.
const API = 'http://localhost:3001';
const lg = await (await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
const id = '11111111-1111-4111-8111-111111111111';
const ctx = { nome: 'NOME-FICTICIO-DO-PACIENTE', cpf: '99999999901', rg: '12.345.678-9', telefone: '11900000000', endereco: 'Rua Fictícia, 1', alergias: 'Dipirona (fictício)', medicamentos: 'Nenhum', anamnese: 'Dor lombar (fictício)', sinaisVitais: { temperatura: 36.5, saturacao_oxigenio: 98, pressao_arterial: '120/80', frequencia_cardiaca: 76 } };
const r = await fetch(`${API}/patients/${id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lg.token }, body: JSON.stringify({ message: 'Pergunta fictícia', patientContext: ctx, history: [] }) });
console.log('HTTP', r.status, (await r.text()).slice(0, 120));
