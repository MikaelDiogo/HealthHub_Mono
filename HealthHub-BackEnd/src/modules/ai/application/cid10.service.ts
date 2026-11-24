import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizarCodigo, type ResultadoCid } from './cid10-extracao';

export interface EstatisticasCid10 { subcategorias: number; categorias: number; tempoCargaMs: number; memoriaAproximadaBytes: number; bytesLidos: number }

const ARQ_SUBCATEGORIAS = 'CID-10-SUBCATEGORIAS.CSV';
const ARQ_CATEGORIAS = 'CID-10-CATEGORIAS.CSV';

/**
 * Conferência LOCAL de códigos CID-10 na tabela oficial do DATASUS (versão 2008). Os dois CSV ficam em
 * src/modules/ai/data/cid10 (copiados para dist/ no build) e nada deles é enviado à Groq.
 * Formato dos arquivos: ISO-8859-1, CRLF, separador ';'. SUBCATEGORIAS: código na coluna 0, DESCRICAO na 4. CATEGORIAS: CAT na 0, DESCRICAO na 2.
 */
@Injectable()
export class Cid10Service {
  /** Pasta dos CSV; muda só em teste. */
  pasta = join(__dirname, '..', 'data', 'cid10');
  private subcategorias?: Map<string, string>;
  private categorias?: Map<string, string>;
  private stats?: EstatisticasCid10;

  private carregar(): void {
    if (this.subcategorias && this.categorias) return;
    const heapAntes = process.memoryUsage().heapUsed;
    const t0 = process.hrtime.bigint();
    const a = this.lerCsv(ARQ_SUBCATEGORIAS, 4);
    const b = this.lerCsv(ARQ_CATEGORIAS, 2);
    this.subcategorias = a.mapa;
    this.categorias = b.mapa;
    this.stats = {
      subcategorias: a.mapa.size,
      categorias: b.mapa.size,
      tempoCargaMs: Number(process.hrtime.bigint() - t0) / 1e6,
      memoriaAproximadaBytes: Math.max(0, process.memoryUsage().heapUsed - heapAntes),
      bytesLidos: a.bytes + b.bytes,
    };
  }

  private lerCsv(nome: string, colDescricao: number): { mapa: Map<string, string>; bytes: number } {
    const buf = readFileSync(join(this.pasta, nome));
    const linhas = buf.toString('latin1').split(/\r?\n/); // latin1 = ISO-8859-1
    const mapa = new Map<string, string>();
    for (const linha of linhas.slice(1)) { // linha 0 = cabeçalho
      if (linha === '') continue;
      const campos = linha.split(';');
      const codigo = normalizarCodigo(campos[0] ?? '');
      if (codigo) mapa.set(codigo, (campos[colDescricao] ?? '').trim());
    }
    return { mapa, bytes: buf.length };
  }

  estatisticas(): EstatisticasCid10 {
    this.carregar();
    return this.stats!;
  }

  /**
   * subcategoria: consta no arquivo de subcategorias (inclui categorias sem subcategorias, como I10).
   * categoria: só o código de 3 caracteres de uma categoria que TEM subcategorias (válido, pouco específico, como I21).
   * nao_consta: o resto. A descrição devolvida é sempre a do arquivo oficial.
   */
  conferir(codigo: string): ResultadoCid {
    this.carregar();
    const n = normalizarCodigo(codigo);
    const sub = this.subcategorias!.get(n);
    if (sub !== undefined) return { codigo: n, situacao: 'subcategoria', descricao: sub };
    const cat = this.categorias!.get(n);
    if (cat !== undefined && n.length === 3) return { codigo: n, situacao: 'categoria', descricao: cat };
    return { codigo: n, situacao: 'nao_consta', descricao: null };
  }
}
