// Processa a coleta_ensaio.csv PREENCHIDA pelo autor: estatísticas por método, tabela (Markdown) e gráfico de barras (SVG).
// Uso: node analisar_ensaio.mjs [caminho_da_coleta.csv]   (padrão: coleta_ensaio.csv ao lado deste script)
// Considera só tentativas "valida" com tempo preenchido. Não afirma significância estatística.
import fs from 'node:fs';
const DIR = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const arq = process.argv[2] || DIR + 'coleta_ensaio.csv';
const linhas = fs.readFileSync(arq, 'utf8').trim().split(/\r?\n/).map((l) => l.split(','));
const h = linhas[0]; const col = (n) => h.indexOf(n);
const rows = linhas.slice(1).map((x) => Object.fromEntries(h.map((k, i) => [k, x[i] ?? ''])));
const validas = rows.filter((r) => r.tentativa === 'valida' && r.tempo_segundos !== '' && !Number.isNaN(Number(r.tempo_segundos)));
const por = { papel: [], sistema: [] };
for (const r of validas) if (por[r.metodo]) por[r.metodo].push(r);
const num = (a) => a.map((r) => Number(r.tempo_segundos));
const media = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const mediana = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const dp = (a) => (a.length < 2 ? NaN : Math.sqrt(a.reduce((s, x) => s + (x - media(a)) ** 2, 0) / (a.length - 1)));
const f = (x) => (Number.isNaN(x) || x === undefined ? '—' : x.toFixed(1));
const est = {};
for (const m of ['papel', 'sistema']) {
  const t = num(por[m]); const r = por[m];
  est[m] = { n: t.length, media: t.length ? media(t) : NaN, mediana: t.length ? mediana(t) : NaN, min: t.length ? Math.min(...t) : NaN, max: t.length ? Math.max(...t) : NaN, dp: dp(t),
    completos: r.filter((x) => x.campos_obrigatorios_completos.toLowerCase().startsWith('s')).length,
    erros: r.reduce((s, x) => s + (Number(x.erros_digitacao_ou_omissoes) || 0), 0) };
}
const taxa = (m) => (est[m].n ? ((est[m].completos / est[m].n) * 100).toFixed(0) + '%' : '—');
const razao = est.papel.n && est.sistema.n ? est.papel.media / est.sistema.media : NaN;
const diff = est.papel.n && est.sistema.n ? est.papel.media - est.sistema.media : NaN;
const md = `# Resultado do ensaio cronometrado (gerado por analisar_ensaio.mjs a partir de ${arq.split(/[\\/]/).pop()})

| Método | n | Média (s) | Mediana (s) | Mín (s) | Máx (s) | Desvio-padrão (s) | Completude | Erros/omissões |
|---|---|---|---|---|---|---|---|---|
| Papel | ${est.papel.n} | ${f(est.papel.media)} | ${f(est.papel.mediana)} | ${f(est.papel.min)} | ${f(est.papel.max)} | ${f(est.papel.dp)} | ${taxa('papel')} | ${est.papel.erros} |
| Sistema | ${est.sistema.n} | ${f(est.sistema.media)} | ${f(est.sistema.mediana)} | ${f(est.sistema.min)} | ${f(est.sistema.max)} | ${f(est.sistema.dp)} | ${taxa('sistema')} | ${est.sistema.erros} |

Diferença das médias (papel − sistema): ${f(diff)} s. Razão papel ÷ sistema: ${Number.isNaN(razao) ? '—' : razao.toFixed(2)}.

${Math.min(est.papel.n, est.sistema.n) < 10 ? '**Atenção: poucas repetições (n < 10 por método). Os números descrevem estas execuções e não permitem concluir nada geral; nenhuma significância estatística foi testada nem é afirmada.**' : 'Mesmo com n ≥ 10, nenhum teste estatístico foi aplicado aqui; não afirme significância sem um teste adequado.'}

Ensaio exploratório do próprio desenvolvedor, com viés de familiaridade; não estima satisfação de usuários nem redução de tempo para enfermeiros.
`;
fs.writeFileSync(DIR + 'resultado_ensaio.md', md);
const max = Math.max(est.papel.media || 0, est.sistema.media || 0, 1);
const bar = (m, y, cor) => `<rect x="120" y="${y}" width="${Math.round(((est[m].media || 0) / max) * 420)}" height="34" fill="${cor}"/><text x="10" y="${y + 22}" font-size="14">${m === 'papel' ? 'Papel' : 'Sistema'}</text><text x="${130 + Math.round(((est[m].media || 0) / max) * 420)}" y="${y + 22}" font-size="13">${f(est[m].media)} s (n=${est[m].n})</text>`;
fs.writeFileSync(DIR + 'grafico_ensaio.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="150" font-family="Arial"><text x="10" y="22" font-size="15" font-weight="bold">Tempo médio por método (segundos)</text>${bar('papel', 40, '#6b7280')}${bar('sistema', 90, '#1d4ed8')}</svg>`);
console.log(md);
