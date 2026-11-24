// Conferência de CID-10 na tabela oficial do DATASUS (versão 2008). Os esperados vêm do CSV lido AQUI, por um leitor independente do serviço
// (linhas e colunas contadas pelo teste), nunca de códigos ou descrições escritos de memória. Os CÓDIGOS usados (I10, E119, J189, R509, I21, G40,
// E999, I999, U07, U071) foram escolhidos a mão e confirmados no CSV antes de entrar aqui; cada teste lê a descrição do próprio arquivo.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Cid10Service } from './cid10.service';

const PASTA = join(__dirname, '..', 'data', 'cid10');
function linhasDeDados(nome: string): string[][] {
  const texto = readFileSync(join(PASTA, nome)).toString('latin1'); // ISO-8859-1
  const linhas = texto.split('\r\n');
  expect(linhas[linhas.length - 1]).toBe(''); // o arquivo termina em CRLF
  return linhas.slice(1, -1).map((l) => l.split(';')); // sem cabeçalho e sem a linha vazia final
}
const SUB = linhasDeDados('CID-10-SUBCATEGORIAS.CSV'); // código = col 0; DESCRICAO = col 4
const CAT = linhasDeDados('CID-10-CATEGORIAS.CSV');    // CAT = col 0; DESCRICAO = col 2
const descSub = (cod: string) => { const l = SUB.find((c) => c[0] === cod); if (!l) throw new Error(cod + ' não está no CSV de subcategorias'); return l[4]; };
const descCat = (cod: string) => { const l = CAT.find((c) => c[0] === cod); if (!l) throw new Error(cod + ' não está no CSV de categorias'); return l[2]; };

describe('Cid10Service: carga dos dois arquivos', () => {
  const svc = new Cid10Service();
  it('o cabeçalho dos arquivos é o esperado', () => {
    const cab = (n: string) => readFileSync(join(PASTA, n)).toString('latin1').split('\r\n')[0];
    expect(cab('CID-10-SUBCATEGORIAS.CSV')).toBe('SUBCAT;CLASSIF;RESTRSEXO;CAUSAOBITO;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS;');
    expect(cab('CID-10-CATEGORIAS.CSV')).toBe('CAT;CLASSIF;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS;');
  });
  it('as contagens do serviço batem com as linhas de dados contadas pelo teste', () => {
    const e = svc.estatisticas();
    expect(e.subcategorias).toBe(SUB.length);
    expect(e.categorias).toBe(CAT.length);
    expect(new Set(SUB.map((c) => c[0])).size).toBe(SUB.length); // sem código repetido
    expect(e.tempoCargaMs).toBeGreaterThan(0);
  });
  it('os códigos de 3 e de 4 caracteres do arquivo de subcategorias somam o total (confronto com a estrutura descrita no pedido)', () => {
    const tres = SUB.filter((c) => c[0].length === 3).length;
    const quatro = SUB.filter((c) => c[0].length === 4).length;
    expect(tres + quatro).toBe(SUB.length);
    console.log(`[CID10] subcategorias=${SUB.length} (3 caracteres=${tres}; 4 caracteres=${quatro}); categorias=${CAT.length}; carga=${svc.estatisticas().tempoCargaMs.toFixed(1)} ms; heap≈${(svc.estatisticas().memoriaAproximadaBytes / 1048576).toFixed(1)} MiB; bytes lidos=${svc.estatisticas().bytesLidos}`);
  });
  it('acentos vêm corretos (ISO-8859-1 decodificado)', () => {
    expect(svc.conferir('I10').descricao).toBe(descSub('I10'));
    expect(svc.conferir('I10').descricao).toMatch(/Hipertensão/);
  });
});

describe('Cid10Service.conferir: códigos que existem (descrição oficial do arquivo)', () => {
  const svc = new Cid10Service();
  it.each(['I10', 'E119', 'J189', 'R509'])('%s consta como subcategoria e a descrição é a do CSV', (cod) => {
    const r = svc.conferir(cod);
    expect(r.situacao).toBe('subcategoria');
    expect(r.codigo).toBe(cod);
    expect(r.descricao).toBe(descSub(cod));
  });
  it('I10 tem 3 caracteres e está no arquivo de SUBCATEGORIAS: vira subcategoria, não categoria', () => {
    expect(SUB.some((c) => c[0] === 'I10')).toBe(true);
    expect(svc.conferir('I10').situacao).toBe('subcategoria');
  });
});

describe('Cid10Service.conferir: categoria sem o quarto caractere', () => {
  const svc = new Cid10Service();
  it.each(['I21', 'G40'])('%s é categoria que TEM subcategorias: situação "categoria" com a descrição do arquivo de categorias', (cod) => {
    expect(SUB.some((c) => c[0] === cod)).toBe(false);                      // não está no arquivo de subcategorias
    expect(SUB.some((c) => c[0].length === 4 && c[0].startsWith(cod))).toBe(true); // mas tem subcategorias
    const r = svc.conferir(cod);
    expect(r.situacao).toBe('categoria');
    expect(r.descricao).toBe(descCat(cod));
  });
});

describe('Cid10Service.conferir: códigos que NÃO constam', () => {
  const svc = new Cid10Service();
  it.each(['E999', 'I999'])('%s tem formato válido e não consta no arquivo', (cod) => {
    expect(SUB.some((c) => c[0] === cod)).toBe(false);
    expect(svc.conferir(cod)).toEqual({ codigo: cod, situacao: 'nao_consta', descricao: null });
  });
  it('COVID-19 (U07.1 e U07): NÃO constam nesta versão 2008 (confirmado no CSV; resultado real, não suposto)', () => {
    expect(SUB.some((c) => c[0] === 'U071' || c[0] === 'U07')).toBe(false);
    expect(CAT.some((c) => c[0] === 'U07')).toBe(false);
    expect(svc.conferir('U07.1').situacao).toBe('nao_consta');
    expect(svc.conferir('U07').situacao).toBe('nao_consta');
  });
  it('texto que não tem formato de código: não consta', () => {
    for (const x of ['', 'ABC', 'hipertensão', '123', 'I1']) expect(svc.conferir(x).situacao).toBe('nao_consta');
  });
});

describe('Cid10Service.conferir: normalização', () => {
  const svc = new Cid10Service();
  it('i21.9, I219 e I21.9 são o mesmo código e dão o mesmo resultado, com a descrição do arquivo', () => {
    const a = svc.conferir('i21.9'), b = svc.conferir('I219'), c = svc.conferir('I21.9');
    expect(a).toEqual(b); expect(b).toEqual(c);
    expect(a.codigo).toBe('I219');
    expect(a.situacao).toBe('subcategoria');
    expect(a.descricao).toBe(descSub('I219'));
  });
  it('espaços nas pontas e minúsculas também normalizam', () => { expect(svc.conferir('  e11.9 ').codigo).toBe('E119'); });
});
