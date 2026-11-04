// S6 — preservação de dados nas migrações (rename gravidade_manchester → classificacao_risco e as migrações seguintes).
// Em banco de TESTE isolado e DESCARTÁVEL criado por este script (nunca produção, nunca o banco de desenvolvimento): aplica as migrações até a
// 1783200000000, cria pacientes e visitas FICTÍCIOS com cores, registra ANTES (contagem, IDs, cores), aplica as migrações seguintes, registra DEPOIS e
// compara; reverte (down) as mesmas migrações, confere que a coluna volta e que os dados são os mesmos; reaplica; descarta o banco.
// Uso: source <ambiente do banco de teste (DB_HOST, DB_PORT, DB_USER, DB_PASS)>; node s6_migration.mjs
// Variáveis opcionais: DB_CONTAINER (padrão healthhub-test-db), EV_DIR (saída; padrão ./saida_s6/).
import fs from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url)).replace(/\\/g, '/');
const BACK = RAIZ + 'HealthHub-BackEnd';
const OUT = (process.env.EV_DIR || fileURLToPath(new URL('./saida_s6/', import.meta.url))).replace(/\\/g, '/').replace(/\/?$/, '/');
fs.mkdirSync(OUT, { recursive: true });
const CONT = process.env.DB_CONTAINER || 'healthhub-test-db';
const DB = `healthhub_s6_${String(Date.now()).slice(-8)}`;
if (!process.env.DB_HOST || process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') throw new Error('Recuse: DB_HOST deve ser localhost (banco de teste local).');
if (String(process.env.DB_PORT) === '5433') throw new Error('Recuse: a porta 5433 é do banco de desenvolvimento. Use o banco de teste isolado.');

const linhas = [];
const L = (s = '') => { linhas.push(s); console.log(s); };
const psql = (sql, db = DB) => execFileSync('docker', ['exec', CONT, 'psql', '-U', 'postgres', '-d', db, '-tAc', sql], { encoding: 'utf8' }).trim();
const npm = (script) => execSync(`npm run ${script}`, { cwd: BACK, env: { ...process.env, DB_NAME: DB }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\x1b\[[0-9;]*m/g, '');
const ultimas = (txt) => txt.split(/\r?\n/).filter((x) => /executed|reverted|migrations are new|No migrations/i.test(x)).join('\n');
const colunaRisco = () => psql(`select column_name from information_schema.columns where table_name='visitas' and column_name in ('gravidade_manchester','classificacao_risco')`);
const snapshot = (col) => ({
  total: Number(psql('select count(*) from visitas')),
  ids: psql(`select string_agg(id::text, ',' order by id) from visitas`),
  cores: psql(`select string_agg(coalesce(${col}, '(sem cor)'), ',' order by id) from visitas`),
  pacientes: Number(psql('select count(*) from pacientes')),
});

L(`# S6 — preservação de dados na migração — ${new Date().toISOString()} — banco descartável ${DB} no contêiner ${CONT}`);
let aprovado = true; const falha = (m) => { aprovado = false; L(`FALHA: ${m}`); };
try {
  psql(`CREATE DATABASE ${DB}`, 'postgres');
  L('\n## 1) aplicar todas as migrações e voltar ao esquema anterior ao rename (reverter as 3 últimas)');
  L(ultimas(npm('migration:run')));
  for (let i = 0; i < 3; i++) L(ultimas(npm('migration:revert')));
  L(`coluna de risco em visitas agora: ${colunaRisco()}`);
  if (colunaRisco() !== 'gravidade_manchester') falha('esperava a coluna gravidade_manchester no esquema anterior');

  L('\n## 2) fixtures FICTÍCIAS (3 pacientes, 6 visitas com cores) e registro ANTES');
  psql(`INSERT INTO pacientes (id, nome_completo, cpf, idade, sexo) VALUES (gen_random_uuid(),'S6 Fictício A','70000000001',30,'F'),(gen_random_uuid(),'S6 Fictício B','70000000002',45,'M'),(gen_random_uuid(),'S6 Fictício C','70000000003',60,'F')`);
  psql(`INSERT INTO visitas (paciente_id, desfecho, gravidade_manchester, motivo_visita)
        SELECT p.id, v.d, v.c, 'fixture fictícia S6' FROM pacientes p
        JOIN (VALUES ('S6 Fictício A','Em Atendimento','Vermelho'),('S6 Fictício A','Alta','Laranja'),('S6 Fictício B','Em Atendimento','Amarelo'),('S6 Fictício B','Alta','Verde'),('S6 Fictício C','Em Atendimento','Azul'),('S6 Fictício C','Alta',NULL)) AS v(n,d,c) ON v.n = p.nome_completo`);
  const antes = snapshot('gravidade_manchester');
  L(JSON.stringify(antes, null, 2));

  L('\n## 3) aplicar as migrações seguintes (rename, índice único da fila, cadastro mínimo) e registrar DEPOIS');
  L(ultimas(npm('migration:run')));
  const depois = snapshot('classificacao_risco');
  L(`coluna de risco em visitas: ${colunaRisco()}`); L(JSON.stringify(depois, null, 2));
  if (colunaRisco() !== 'classificacao_risco') falha('a coluna classificacao_risco deveria existir (e gravidade_manchester não)');
  for (const k of Object.keys(antes)) if (antes[k] !== depois[k]) falha(`${k} mudou: ${antes[k]} → ${depois[k]}`);

  L('\n## 4) reverter (down) as mesmas 3 migrações e conferir');
  for (let i = 0; i < 3; i++) L(ultimas(npm('migration:revert')));
  const revertido = snapshot('gravidade_manchester');
  L(`coluna de risco em visitas: ${colunaRisco()}`); L(JSON.stringify(revertido, null, 2));
  if (colunaRisco() !== 'gravidade_manchester') falha('a reversão deveria restaurar gravidade_manchester');
  for (const k of Object.keys(antes)) if (antes[k] !== revertido[k]) falha(`após a reversão, ${k} mudou: ${antes[k]} → ${revertido[k]}`);

  L('\n## 5) reaplicar para deixar o banco no esquema atual e conferir de novo');
  L(ultimas(npm('migration:run')));
  const final = snapshot('classificacao_risco');
  for (const k of Object.keys(antes)) if (antes[k] !== final[k]) falha(`após reaplicar, ${k} mudou`);
  L(`migrações registradas: ${psql('select count(*) from migrations')}`);
} catch (e) {
  falha(`erro inesperado: ${String(e.message).slice(0, 400)}`);
} finally {
  try { psql(`DROP DATABASE IF EXISTS ${DB}`, 'postgres'); L(`\nBanco descartável ${DB} removido.`); } catch (e) { L(`(não consegui remover ${DB}: ${String(e.message).slice(0, 120)})`); }
}
L(`\nRESULTADO S6: ${aprovado ? 'APROVADO' : 'REPROVADO'} (contagens, IDs e cores idênticos antes/depois/reversão; coluna classificacao_risco presente e gravidade_manchester restaurada na reversão)`);
fs.writeFileSync(OUT + 's6-migration.log', linhas.join('\n') + '\n');
fs.writeFileSync(OUT + 's6_resultado.json', JSON.stringify({ data: new Date().toISOString(), banco: DB, resultado: aprovado ? 'APROVADO' : 'REPROVADO' }, null, 2));
process.exit(aprovado ? 0 : 1);
