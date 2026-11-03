// Deixa o sistema "limpo" entre as repetições do ensaio: apaga a fila e os pacientes FICTÍCIO-* do banco de teste ISOLADO.
// Uso: source /tmp/testenv_perf.sh (ou o ambiente do banco de teste); node reiniciar_sistema_limpo.mjs
// Recusa rodar se DB_NAME não parecer um banco de teste (nome sem "test"). Nunca aponte para o banco de desenvolvimento.
import { execFileSync } from 'node:child_process';
const DB = process.env.DB_NAME;
if (!DB || !/test/i.test(DB)) { console.error('DB_NAME ausente ou não parece banco de teste; abortando.'); process.exit(1); }
const sql = `DELETE FROM fila_pacientes; DELETE FROM pacientes WHERE nome_completo LIKE 'FICTÍCIO-%';`;
const out = execFileSync('docker', ['exec', '-i', 'healthhub-test-db', 'psql', '-U', 'postgres', '-d', DB, '-qAtc', sql], { encoding: 'utf8' });
console.log(`sistema limpo em ${DB}`, out.trim());
