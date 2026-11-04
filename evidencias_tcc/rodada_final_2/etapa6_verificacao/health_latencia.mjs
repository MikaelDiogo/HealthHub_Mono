// GET /health: aquecimento de 10 requisições e 200 medidas, sequencial (mesma metodologia do desempenho.mjs)
const API = process.env.API || 'http://localhost:3001';
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; };
for (let i = 0; i < 10; i++) await fetch(API + '/health');
const t = [];
for (let i = 0; i < 200; i++) { const a = performance.now(); const r = await fetch(API + '/health'); await r.text(); t.push(performance.now() - a); if (r.status !== 200) throw new Error('status ' + r.status); }
const f = (x) => x.toFixed(1);
console.log(`GET /health sequencial: n=200 min=${f(Math.min(...t))} p50=${f(q(t, 50))} p95=${f(q(t, 95))} p99=${f(q(t, 99))} max=${f(Math.max(...t))} ms`);
