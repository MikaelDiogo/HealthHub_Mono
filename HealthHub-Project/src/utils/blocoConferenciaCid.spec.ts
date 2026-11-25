// A tela do chat (pages/Monitoring) mostra a resposta com <ReactMarkdown>. Este teste prova que o bloco de conferência de CID (acrescentado pelo
// backend ao fim do texto, rodada 5) NÃO perde as quebras de linha ali: cabeçalho num parágrafo e uma linha de lista por código. Por isso o
// frontend não precisou mudar. O texto do bloco é o formato exato do pedido (os testes do backend conferem o mesmo texto).
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';

const html = (texto: string) => renderToStaticMarkup(createElement(ReactMarkdown, { children: texto }));
const BLOCO = [
  'Conferência na CID-10 (DATASUS, versão 2008):',
  '- I10 – Hipertensão essencial (primária): consta na tabela.',
  '- I21 – Infarto agudo do miocárdio: consta como categoria (sem o quarto caractere).',
  '- X12.3 – não consta na tabela CID-10 do DATASUS (versão 2008).',
].join('\n');

describe('bloco de conferência de CID na tela (ReactMarkdown)', () => {
  const saida = html('Hipóteses: hipertensão.\nCID-10: I10 – Hipertensão essencial (primária)\n\n' + BLOCO);
  it('cada código do bloco vira um item de lista (3 itens), separado do texto do modelo', () => {
    expect((saida.match(/<li>/g) || []).length).toBe(3);
    expect(saida).toContain('<li>I10 – Hipertensão essencial (primária): consta na tabela.</li>');
    expect(saida).toContain('<li>X12.3 – não consta na tabela CID-10 do DATASUS (versão 2008).</li>');
  });
  it('o cabeçalho do bloco fica em parágrafo próprio, antes da lista', () => {
    expect(saida).toMatch(/<p>Conferência na CID-10 \(DATASUS, versão 2008\):<\/p>\s*<ul>/);
  });
  it('a linha "nenhum código identificado" aparece inteira, em um parágrafo', () => {
    expect(html('Texto.\n\nConferência na CID-10 (DATASUS, versão 2008): nenhum código identificado na resposta.'))
      .toContain('<p>Conferência na CID-10 (DATASUS, versão 2008): nenhum código identificado na resposta.</p>');
  });
});
