// Trava dos textos legais: o sistema guarda IDADE (não existe campo de data de nascimento). Se a expressão "data de nascimento" voltar ao
// termo de uso, à página da política ou ao gerador do PDF da política, este teste falha. Lê os arquivos-fonte, não renderiza telas.
import { describe, it, expect } from 'vitest';
const ARQUIVOS = [
  'src/components/TermosUsoModal/index.tsx',
  'src/pages/PoliticaDados/index.tsx',
  'src/utils/gerarPDFPolitica.ts',
];
// O Vite entrega o texto-fonte de cada arquivo (sem executar nada); a chave é o caminho a partir da raiz do frontend.
const FONTES = import.meta.glob(['/src/components/TermosUsoModal/index.tsx', '/src/pages/PoliticaDados/index.tsx', '/src/utils/gerarPDFPolitica.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const lerTexto = (rel: string) => { const t = FONTES['/' + rel]; if (typeof t !== 'string') throw new Error('arquivo não encontrado: ' + rel); return t; };
export const citaDataDeNascimento = (t: string) => /data\s+de\s+nascimento|nascimento/i.test(t);

describe('textos legais não citam "data de nascimento"', () => {
  for (const rel of ARQUIVOS) {
    it(`${rel}: sem "nascimento"`, () => { expect(citaDataDeNascimento(lerTexto(rel))).toBe(false); });
  }
  it('o termo e o gerador do PDF dizem que o dado guardado é a idade', () => {
    expect(lerTexto(ARQUIVOS[0])).toMatch(/idade/);
    expect(lerTexto(ARQUIVOS[2])).toMatch(/idade/);
  });
  it('a própria verificação funciona: acusa o texto que cita data de nascimento', () => {
    expect(citaDataDeNascimento('CPF, RG, data de nascimento, sexo')).toBe(true);
    expect(citaDataDeNascimento('Data  de\nNascimento')).toBe(true);
    expect(citaDataDeNascimento('CPF, RG, idade, sexo')).toBe(false);
  });
});
