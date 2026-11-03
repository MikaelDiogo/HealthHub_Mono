// Tarefa 5 (parte IA) — latência REAL do chat de IA (30 chamadas) e da transcrição de áudio (30 chamadas).
// A chave da Groq vive só no processo da API (carregada do .env do backend); este script NÃO a vê, não a lê e não a imprime.
// Espaçamento padrão: 13 s entre chamadas de chat (limite de 8.000 tokens/min da conta) e 4 s entre as de áudio (limite de requisições/min).
// Uso: source /tmp/testenv_perf.sh; node t5_ia_real.mjs   (API em http://localhost:3001, SEM o mock)
import fs from 'node:fs';
const API = 'http://localhost:3001';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lg = await (await fetch(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.SEED_MEDICO_EMAIL, password: process.env.SEED_MEDICO_SENHA }) })).json();
const H = { Authorization: 'Bearer ' + lg.token };
const ID = '11111111-1111-4111-8111-111111111111'; // só o formato é validado pelo backend
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
const contexto = { alergias: 'Dipirona (fictício)', medicamentos: 'Nenhum (fictício)', anamnese: 'Dor lombar há 2 dias após esforço, sem febre (texto fictício).', sinaisVitais: { temperatura: 36.6, saturacao_oxigenio: 98, pressao_arterial: '120/80', frequencia_cardiaca: 76 } };
const PERGUNTA = 'Quais os diagnósticos diferenciais mais prováveis, os sinais de alerta a pesquisar e a conduta inicial? Sugira o CID provável.';
const linhas = ['tipo,n,http,latencia_ms,tamanho_resposta_chars'];
const lat = { chat: [], audio: [] }; const st = { chat: {}, audio: {} };
let primeiroChat = null, primeiraTranscricao = null;
console.log(`# ${new Date().toISOString()} — modelo de chat: openai/gpt-oss-120b; transcrição: whisper-large-v3-turbo (constantes do backend)`);

for (let i = 1; i <= 30; i++) {
  const t0 = performance.now();
  const r = await fetch(`${API}/patients/${ID}/chat`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: PERGUNTA, patientContext: contexto, history: [] }) });
  const txt = await r.text(); const ms = performance.now() - t0; let d = null; try { d = JSON.parse(txt); } catch {}
  st.chat[r.status] = (st.chat[r.status] ?? 0) + 1; if (r.status === 201) lat.chat.push(ms);
  if (r.status === 201 && !primeiroChat) primeiroChat = d?.reply ?? '';
  linhas.push(`chat,${i},${r.status},${ms.toFixed(0)},${(d?.reply ?? '').length}`);
  console.log(`chat ${i}: HTTP ${r.status} ${ms.toFixed(0)} ms`); await sleep(Number(process.env.CHAT_GAP_MS ?? 13000));
}

const wav = fs.readFileSync(OUT + 'audio_ficticio/ditado_ficticio.wav');
for (let i = 1; i <= 30; i++) {
  const fd = new FormData(); fd.append('audio', new Blob([wav], { type: 'audio/wav' }), 'ditado_ficticio.wav');
  const t0 = performance.now();
  const r = await fetch(`${API}/patients/${ID}/chat/audio`, { method: 'POST', headers: H, body: fd });
  const txt = await r.text(); const ms = performance.now() - t0; let d = null; try { d = JSON.parse(txt); } catch {}
  st.audio[r.status] = (st.audio[r.status] ?? 0) + 1; if (r.status === 201) lat.audio.push(ms);
  if (r.status === 201 && !primeiraTranscricao) primeiraTranscricao = d?.transcription ?? '';
  linhas.push(`audio,${i},${r.status},${ms.toFixed(0)},${(d?.transcription ?? '').length}`);
  console.log(`audio ${i}: HTTP ${r.status} ${ms.toFixed(0)} ms`); await sleep(Number(process.env.AUDIO_GAP_MS ?? 4000));
}

fs.writeFileSync(OUT + 't5_ia_real_latencias.csv', linhas.join('\n') + '\n');
if (primeiroChat) fs.writeFileSync(OUT + 't5_ia_real_exemplo_resposta_chat.md', `# Exemplo de resposta real do chat (1ª chamada, caso 100% fictício)\n\nPergunta: ${PERGUNTA}\n\n---\n\n${primeiroChat}\n`);
if (primeiraTranscricao) fs.writeFileSync(OUT + 't5_ia_real_exemplo_transcricao.txt', primeiraTranscricao + '\n');
const resumo = (k) => { const a = lat[k]; return a.length ? `n=${a.length} min=${Math.min(...a).toFixed(0)} p50=${pct(a, 50).toFixed(0)} p95=${pct(a, 95).toFixed(0)} p99=${pct(a, 99).toFixed(0)} max=${Math.max(...a).toFixed(0)} ms` : 'sem respostas 201'; };
console.log(`\nRESUMO chat : ${resumo('chat')} | status ${JSON.stringify(st.chat)}\nRESUMO audio: ${resumo('audio')} | status ${JSON.stringify(st.audio)}`);
