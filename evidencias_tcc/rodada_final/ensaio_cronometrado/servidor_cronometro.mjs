// Cronômetro do ensaio papel × HealthHub. Servidor local (só 127.0.0.1) que serve a página e GRAVA os tempos na coleta_ensaio.csv.
// Uso: node servidor_cronometro.mjs   → abra http://localhost:3030
// Variáveis opcionais: PORT (3030), ENSAIO_CSV (caminho da planilha), ENSAIO_DB (banco de teste para o botão "deixar o sistema limpo").
// Regras: nunca sobrescreve uma medição já gravada (uma nova tentativa vira linha adicional); guarda cópia (.bak) e um registro de tudo (.jsonl).
// Não usa internet, não tem dependências e não grava nada além dos arquivos desta pasta.
import http from 'node:http';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const DIR = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PORT = Number(process.env.PORT || 3030);
const CSV = process.env.ENSAIO_CSV || DIR + 'coleta_ensaio.csv';
const CASOS = DIR + 'casos_fonte.csv';
const LOG = CSV.replace(/\.csv$/, '') + '_registro.jsonl';
const HTML = fs.readFileSync(DIR + 'cronometro.html', 'utf8');

function parse(t) { const rows = []; let c = '', q = false, r = []; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = ''; } else if (ch === '\n') { r.push(c); rows.push(r); r = []; c = ''; } else if (ch !== '\r') c += ch; } if (c || r.length) { r.push(c); rows.push(r); } return rows.filter((x) => x.length > 1 || x[0]); }
const esc = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const ler = (arq) => { const r = parse(fs.readFileSync(arq, 'utf8')); const h = r[0]; return { h, linhas: r.slice(1).map((x) => Object.fromEntries(h.map((k, i) => [k, x[i] ?? '']))) }; };
function gravar(h, linhas) {
  if (fs.existsSync(CSV)) fs.copyFileSync(CSV, CSV.replace(/\.csv$/, '') + '.bak');
  const tmp = CSV + '.tmp'; fs.writeFileSync(tmp, [h.join(','), ...linhas.map((l) => h.map((k) => esc(l[k])).join(','))].join('\n') + '\n'); fs.renameSync(tmp, CSV);
}
const auditar = (o) => fs.appendFileSync(LOG, JSON.stringify({ em: new Date().toISOString(), ...o }) + '\n');
const json = (res, st, o) => { res.writeHead(st, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
const corpo = (req) => new Promise((ok, no) => { const partes = []; let n = 0; req.on('data', (d) => { n += d.length; if (n > 1e5) req.destroy(); else partes.push(d); }); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(partes).toString('utf8') || '{}')); } catch (e) { no(e); } }); });

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(HTML); }
    if (req.method === 'GET' && req.url === '/api/estado') { const { linhas } = ler(CSV); return json(res, 200, { linhas, casos: ler(CASOS).linhas, csv: CSV }); }
    if (req.method === 'POST' && req.url === '/api/salvar') {
      const d = await corpo(req); const { h, linhas } = ler(CSV); const i = Number(d.indice);
      if (!Number.isInteger(i) || i < 0 || i >= linhas.length) return json(res, 400, { erro: 'linha inválida' });
      const seg = Number(d.tempo_segundos); if (!(seg > 0)) return json(res, 400, { erro: 'tempo inválido' });
      const base = linhas[i];
      const nova = { ...base, hora_inicio: d.hora_inicio, hora_fim: d.hora_fim, tempo_segundos: seg.toFixed(1), campos_obrigatorios_completos: d.campos_completos, erros_digitacao_ou_omissoes: String(d.erros ?? ''), falhas: d.falhas ?? '', precisou_ajuda: d.ajuda ?? '', observacoes: d.observacoes ?? '' };
      let onde = i;
      if (base.tempo_segundos) { // já havia medição: preserva a anterior e acrescenta nova linha logo depois
        nova.observacoes = ('TENTATIVA ADICIONAL (a anterior foi preservada). ' + nova.observacoes).trim();
        linhas.splice(i + 1, 0, nova); onde = i + 1;
      } else linhas[i] = nova;
      gravar(h, linhas); auditar({ acao: 'salvar', indice: onde, caso: base.caso, repeticao: base.repeticao, metodo: base.metodo, tempo_segundos: nova.tempo_segundos, adicional: onde !== i });
      return json(res, 200, { ok: true, indice: onde });
    }
    if (req.method === 'POST' && req.url === '/api/cancelar') { const d = await corpo(req); auditar({ acao: 'cancelar', indice: d.indice, motivo: d.motivo ?? '' }); return json(res, 200, { ok: true }); }
    if (req.method === 'POST' && req.url === '/api/limpar-sistema') {
      const db = process.env.ENSAIO_DB || process.env.DB_NAME;
      if (!db || !/test/i.test(db)) return json(res, 400, { erro: 'Banco de teste não configurado (variável ENSAIO_DB). Peça ajuda antes de continuar.' });
      const sql = "DELETE FROM fila_pacientes; DELETE FROM pacientes WHERE nome_completo LIKE 'FICTÍCIO-%';";
      const out = execFileSync('docker', ['exec', '-i', 'healthhub-test-db', 'psql', '-U', 'postgres', '-d', db, '-qAtc', sql], { encoding: 'utf8' });
      auditar({ acao: 'limpar-sistema', db }); return json(res, 200, { ok: true, db, saida: out.trim() });
    }
    json(res, 404, { erro: 'não encontrado' });
  } catch (e) { json(res, 500, { erro: String(e.message).slice(0, 300) }); }
}).listen(PORT, '127.0.0.1', () => console.log(`Cronômetro do ensaio: http://localhost:${PORT}  (planilha: ${CSV})`));
