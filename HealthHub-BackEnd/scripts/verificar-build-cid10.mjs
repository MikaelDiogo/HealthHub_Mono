// Prova do build: depois de `npm run build`, confere que os CSV da CID-10 foram copiados para dist/ (mesmos bytes da fonte) e que o serviço COMPILADO
// os encontra e confere códigos, rodando a partir de OUTRA pasta de trabalho. Uso (na pasta HealthHub-BackEnd): node scripts/verificar-build-cid10.mjs
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
let ok = true;
const checar = (nome, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FALHOU'} ${nome}${extra ? ' ' + extra : ''}`); if (!cond) ok = false; };

for (const n of ['CID-10-SUBCATEGORIAS.CSV', 'CID-10-CATEGORIAS.CSV']) {
  const fonte = join(RAIZ, 'src', 'modules', 'ai', 'data', 'cid10', n);
  const dist = join(RAIZ, 'dist', 'modules', 'ai', 'data', 'cid10', n);
  checar(`dist/ tem ${n}`, existsSync(dist));
  if (existsSync(dist)) checar(`${n}: bytes de dist/ = bytes da fonte`, sha(dist) === sha(fonte), sha(dist).slice(0, 12) + '...');
}
process.chdir(mkdtempSync(join(tmpdir(), 'cid10-build-'))); // outra pasta de trabalho: o serviço não pode depender do cwd
const { Cid10Service } = createRequire(import.meta.url)(join(RAIZ, 'dist', 'modules', 'ai', 'application', 'cid10.service.js'));
const svc = new Cid10Service();
const e = svc.estatisticas();
checar('serviço compilado carrega as duas tabelas', e.subcategorias > 0 && e.categorias > 0, `(subcategorias=${e.subcategorias}, categorias=${e.categorias})`);
checar('I10 consta como subcategoria', svc.conferir('I10').situacao === 'subcategoria');
checar('I21 consta como categoria', svc.conferir('I21').situacao === 'categoria');
checar('U07.1 não consta (versão 2008)', svc.conferir('U07.1').situacao === 'nao_consta');
console.log(ok ? 'RESULTADO: APROVADO' : 'RESULTADO: REPROVADO');
process.exit(ok ? 0 : 1);
