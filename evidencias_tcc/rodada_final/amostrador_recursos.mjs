// Tarefa 9 — amostra CPU e memória do banco (docker stats) e da API (processo Node) a cada ~2 s, até existir o arquivo "parar".
// Uso: node amostrador_recursos.mjs <rótulo>   → escreve recursos_<rótulo>.csv ao lado deste script.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const rotulo = process.argv[2] || 'amostra';
const arq = `${OUT}recursos_${rotulo}.csv`;
fs.writeFileSync(arq, 'instante_utc,db_cpu_pct,db_mem_mib,api_cpu_s_acumulado,api_mem_ws_mib\n');
const mib = (s) => { const m = /([\d.]+)\s*(KiB|MiB|GiB)/.exec(s); if (!m) return ''; return (Number(m[1]) * ({ KiB: 1 / 1024, MiB: 1, GiB: 1024 }[m[2]])).toFixed(1); };
while (!fs.existsSync(OUT + 'parar')) {
  let db = ['', ''];
  try { const l = execFileSync('docker', ['stats', '--no-stream', '--format', '{{.CPUPerc}}|{{.MemUsage}}', 'healthhub-test-db'], { encoding: 'utf8' }).trim().split('|'); db = [l[0].replace('%', ''), mib(l[1])]; } catch {}
  let api = ['', ''];
  try {
    const o = execFileSync('powershell', ['-NoProfile', '-Command', "$p=Get-Process -Id (Get-NetTCPConnection -LocalPort 3001 -State Listen | Select-Object -First 1).OwningProcess; '{0:N1}|{1:N1}' -f $p.CPU, ($p.WorkingSet64/1MB)"], { encoding: 'utf8' }).trim().split('|');
    api = [o[0].replace(',', '.'), o[1].replace(',', '.')];
  } catch {}
  fs.appendFileSync(arq, `${new Date().toISOString()},${db[0]},${db[1]},${api[0]},${api[1]}\n`);
}
fs.unlinkSync(OUT + 'parar');
