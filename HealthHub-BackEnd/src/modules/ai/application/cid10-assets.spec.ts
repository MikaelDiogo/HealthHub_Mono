// Os CSV da CID-10 têm de ir para dist/ no build. Aqui confere a CONFIGURAÇÃO (nest-cli.json) e os bytes dos arquivos da fonte; a prova do build real
// (npm run build + execução a partir de dist/) é feita por scripts/verificar-build-cid10.mjs.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const RAIZ = process.cwd(); // vitest roda na pasta do backend
describe('CSV da CID-10 no build', () => {
  it('nest-cli.json copia os CSV para dist/ (assets)', () => {
    const cfg = JSON.parse(readFileSync(join(RAIZ, 'nest-cli.json'), 'utf8'));
    const assets = cfg.compilerOptions.assets as Array<{ include: string }>;
    expect(assets.map((a) => a.include)).toContain('modules/ai/data/cid10/*.CSV');
  });
  it('os arquivos da fonte têm os SHA-256 registrados no README da fonte', () => {
    const pasta = join(RAIZ, 'src', 'modules', 'ai', 'data', 'cid10');
    const readme = readFileSync(join(pasta, 'README.md'), 'utf8');
    for (const nome of ['CID-10-SUBCATEGORIAS.CSV', 'CID-10-CATEGORIAS.CSV']) {
      const sha = createHash('sha256').update(readFileSync(join(pasta, nome))).digest('hex');
      expect(readme).toContain(sha);
    }
  });
});
