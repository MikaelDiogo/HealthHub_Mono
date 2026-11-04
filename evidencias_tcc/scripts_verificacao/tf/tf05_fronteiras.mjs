// TF05 — alertas nas fronteiras exatas do roteiro (Apêndice A). Chama as funções REAIS do frontend (vitalStatus.ts) e do backend (motivoCritico).
// Uso (dentro de HealthHub-BackEnd): node --import tsx ../evidencias_tcc/scripts_verificacao/tf/tf05_fronteiras.mjs
// Não valida clinicamente os pontos de corte: confere só o que o código implementa hoje.
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Raiz do repositório, a partir da posição deste arquivo (evidencias_tcc/scripts_verificacao/tf/)
const R = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\\/g, '/');
const front = await import(pathToFileURL(R + 'HealthHub-Project/src/utils/vitalStatus.ts').href);
const back = await import(pathToFileURL(R + 'HealthHub-BackEnd/src/modules/metricas/application/calcular-metricas.ts').href);
const OUT = process.env.EV_DIR ? process.env.EV_DIR.replace(/\/?$/, '/') : R + 'evidencias_tcc/scripts_verificacao/saida_tf05/';
fs.mkdirSync(OUT, { recursive: true });

// Esperado = limiares implementados e documentados em vitalStatus.spec.ts / limiares_sinais_vitais.md (SpO2 <92 crítico, <95 atenção; FC <60 ou >100 crítico, >90 atenção; Temp >38,5 crítico, >=37,8 atenção)
const casos = [
  ['SpO₂', [91, 92, 94, 95, 96], front.spo2Status, (v) => back.motivoCritico({ saturacao_oxigenio: v }), { 91: 'critical', 92: 'warning', 94: 'warning', 95: 'normal', 96: 'normal' }],
  ['FC', [59, 60, 90, 91, 100, 101], front.fcStatus, (v) => back.motivoCritico({ frequencia_cardiaca: v }), { 59: 'critical', 60: 'normal', 90: 'normal', 91: 'warning', 100: 'warning', 101: 'critical' }],
  ['Temperatura', [37.7, 37.8, 38.5, 38.6], front.tempStatus, (v) => back.motivoCritico({ temperatura: v }), { 37.7: 'normal', 37.8: 'warning', 38.5: 'warning', 38.6: 'critical' }],
];
const linhas = ['| Sinal | Valor | Frontend (estado) | Esperado (limiar implementado) | Backend: "crítico"? | Confere |', '|---|---|---|---|---|---|'];
let ok = 0, total = 0;
for (const [nome, valores, fnFront, fnBack, esp] of casos) for (const v of valores) {
  const obtido = fnFront(v); const crit = fnBack(v) !== null; const critEsperado = esp[v] === 'critical';
  const confere = obtido === esp[v] && crit === critEsperado; total++; if (confere) ok++;
  linhas.push(`| ${nome} | ${v} | ${obtido} | ${esp[v]} | ${crit ? 'sim' : 'não'} | ${confere ? 'sim' : '**NÃO**'} |`);
}
const md = `# TF05 — alertas nas fronteiras exatas (Apêndice A)\n\nFunções reais: \`spo2Status\`, \`fcStatus\`, \`tempStatus\` (frontend) e \`motivoCritico\` (backend). **Não valida clinicamente os pontos de corte**; confere só o que o código implementa. PA: sem regra definida (sem alerta).\n\n${linhas.join('\n')}\n\nResultado: ${ok}/${total} conferem. Observação: o backend só tem o nível "crítico" (não tem "atenção"), por isso a coluna do backend compara apenas esse nível.\n`;
fs.writeFileSync(OUT + 'tf05_fronteiras.md', md); console.log(md);
fs.writeFileSync(OUT + 'tf05_resultado.json', JSON.stringify({ confere: ok, total }));
