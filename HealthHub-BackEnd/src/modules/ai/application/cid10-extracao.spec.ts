// Extração conservadora de códigos CID e bloco de conferência. Esperados escritos à mão a partir do pedido da rodada 5.
import { describe, it, expect } from 'vitest';
import { extrairCodigos, mencionaCid, formatarCodigoOficial, posicaoLinhaCid, blocoDeConferencia, anexarConferencia, removerConferencia, CABECALHO_CONFERENCIA, LINHA_SEM_CODIGO, type ResultadoCid } from './cid10-extracao';

describe('extrairCodigos: o que deve extrair', () => {
  it('"CID-10: I10 – ...; E11.9 – ..." devolve os dois (sem ponto, em ordem)', () => {
    expect(extrairCodigos('CID-10: I10 – Hipertensão essencial (primária); E11.9 – Diabetes mellitus sem complicações')).toEqual(['I10', 'E119']);
  });
  it('só considera linhas com a palavra CID (qualquer caixa), em várias linhas', () => {
    expect(extrairCodigos('Hipótese: diabetes (E11.9)\ncid provável: J18.9\nOutra linha com R50.9')).toEqual(['J189']);
  });
  it('não repete código', () => { expect(extrairCodigos('CID: I10; de novo I10 e I10')).toEqual(['I10']); });
  it('código no fim da linha, entre parênteses e antes de ponto final', () => {
    expect(extrairCodigos('CID provável (I10).')).toEqual(['I10']);
    expect(extrairCodigos('Sugestão de CID: R50.9.')).toEqual(['R509']);
  });
});

describe('extrairCodigos: falsos positivos que NÃO podem sair', () => {
  it.each([
    ['vitamina B12 numa linha com CID', 'CID: investigar deficiência de vitamina B12'],
    ['vitamina B12 antes do código', 'CID-10: dosar Vitamina B12; I10 – Hipertensão'],
    ['papel A4', 'Para o CID imprimir em papel A4'],
    ['T4 livre', 'CID provável: pedir T4 livre e TSH'],
    ['intervalo T36-T50', 'CID-10: capítulo T36-T50 (intoxicações)'],
    ['intervalo com travessão I10–I15', 'CID-10: grupo I10–I15'],
    ['CID10 colado', 'Usar CID10 como base'],
    ['COVID19 colado', 'CID: COVID19 não conta'],
    ['dois decimais', 'CID: I21.90'],
    ['minúsculas', 'CID: i10'],
  ])('%s', (_nome, texto) => {
    const r = extrairCodigos(texto);
    if (_nome === 'vitamina B12 antes do código') expect(r).toEqual(['I10']); // só o código de verdade fica
    else expect(r).toEqual([]);
  });
  it('linhas SEM a palavra CID não geram código, mesmo com "B12", "A4" e "I10"', () => {
    expect(extrairCodigos('Vitamina B12, papel A4 e T4 livre. Hipótese I10 provável.')).toEqual([]);
  });
  it('palavras que apenas contêm "cid" (decidir, incidência) não contam como a palavra CID', () => {
    expect(mencionaCid('é preciso decidir a conduta; incidência alta; I10')).toBe(false);
    expect(extrairCodigos('é preciso decidir a conduta I10')).toEqual([]);
  });
});

// ── Pedido 7, Passo 3: linha que começa por "CID-10:" / "CID:" aceita o código de 4 caracteres SEM ponto; formato oficial no bloco ──
describe('linha que COMEÇA por CID-10: / CID: (código de 4 caracteres sem ponto)', () => {
  it('"CID: E119" e "CID-10: E119 – ..." extraem E119 (antes do pedido 7 o esperado era [])', () => {
    expect(extrairCodigos('CID: E119 sem ponto')).toEqual(['E119']);
    expect(extrairCodigos('CID-10: E119 – Diabetes; I10 – Hipertensão; J18.9 – Pneumonia')).toEqual(['E119', 'I10', 'J189']);
  });
  it('com marcação Markdown na frente e com hífen não separável (o modelo usa)', () => {
    expect(extrairCodigos('**CID-10:** E119 – Diabetes')).toEqual(['E119']);
    expect(extrairCodigos('CID\u201110: M545 – Lombalgia')).toEqual(['M545']);
  });
  it('nas DEMAIS linhas a regra conservadora continua: E119 sem ponto NÃO é extraído', () => {
    expect(extrairCodigos('Hipótese: cid provável: E119')).toEqual([]);   // a linha não COMEÇA por CID:
    expect(extrairCodigos('Sugestão de CID (E119)')).toEqual([]);
  });
  it('mesmo na linha CID-10: continuam fora vitamina B12, intervalos, cinco caracteres e dois decimais', () => {
    expect(extrairCodigos('CID-10: vitamina B12; T36-T50; E1190; I21.90')).toEqual([]);
  });
  it('posicaoLinhaCid: 1 = primeira linha; null se nenhuma linha começa por CID-10:/CID:', () => {
    expect(posicaoLinhaCid('CID-10: I10 – x\nresto')).toBe(1);
    expect(posicaoLinhaCid('Texto\n\n**CID-10:** I10')).toBe(3);
    expect(posicaoLinhaCid('Texto que cita CID no meio\noutra linha')).toBeNull();
  });
});

describe('formatarCodigoOficial: 3 caracteres sem ponto; 4 caracteres com ponto depois do terceiro', () => {
  it.each([['I10', 'I10'], ['I21', 'I21'], ['E119', 'E11.9'], ['e11.9', 'E11.9'], ['J189', 'J18.9'], ['X123', 'X12.3'], ['i219', 'I21.9']])('%s -> %s', (entrada, esperado) => {
    expect(formatarCodigoOficial(entrada)).toBe(esperado);
  });
  it('o bloco mostra E11.9, mesmo que o código tenha sido extraído como E119', () => {
    const bloco = blocoDeConferencia('CID-10: E119 – x', (c) => ({ codigo: c, situacao: 'subcategoria', descricao: 'D' }));
    expect(bloco).toBe('Conferência na CID-10 (DATASUS, versão 2008):\n- E11.9 – D: consta na tabela.');
  });
});

describe('mencionaCid', () => {
  it('detecta a palavra CID e CID-10, sem diferenciar caixa', () => {
    expect(mencionaCid('Sugestão de CID: ?')).toBe(true);
    expect(mencionaCid('cid-10: nada')).toBe(true);
    expect(mencionaCid('texto sem a sigla')).toBe(false);
    expect(mencionaCid('')).toBe(false);
  });
});

// Tabela FALSA só para testar o formato do bloco (os testes de conteúdo oficial estão em cid10.service.spec.ts)
const falsa = (codigo: string): ResultadoCid => ({
  I10: { codigo: 'I10', situacao: 'subcategoria' as const, descricao: 'DESCRICAO-A' },
  I21: { codigo: 'I21', situacao: 'categoria' as const, descricao: 'DESCRICAO-B' },
}[codigo] ?? { codigo, situacao: 'nao_consta', descricao: null });

describe('bloco de conferência: texto exato', () => {
  it('três situações no formato do pedido', () => {
    const bloco = blocoDeConferencia('CID-10: I10 – x; I21 – y; X12.3 – z', falsa);
    expect(bloco).toBe([
      'Conferência na CID-10 (DATASUS, versão 2008):',
      '- I10 – DESCRICAO-A: consta na tabela.',
      '- I21 – DESCRICAO-B: consta como categoria (sem o quarto caractere).',
      '- X12.3 – não consta na tabela CID-10 do DATASUS (versão 2008).',
    ].join('\n'));
  });
  it('menciona CID mas nenhum código identificado: linha única do pedido', () => {
    expect(blocoDeConferencia('Sugerir CID depois do exame', falsa)).toBe('Conferência na CID-10 (DATASUS, versão 2008): nenhum código identificado na resposta.');
    expect(LINHA_SEM_CODIGO).toBe('Conferência na CID-10 (DATASUS, versão 2008): nenhum código identificado na resposta.');
  });
  it('não menciona CID: nenhum bloco (null)', () => { expect(blocoDeConferencia('Hipertensão provável. Medir PA.', falsa)).toBeNull(); });
});

describe('anexarConferencia', () => {
  const orig = 'Hipóteses: hipertensão.\nCID-10: I10 – Hipertensão essencial';
  it('acrescenta ao FINAL, separado por UMA linha em branco, sem alterar o texto original (prefixo exato)', () => {
    const out = anexarConferencia(orig, falsa);
    expect(out.startsWith(orig)).toBe(true);
    expect(out.slice(orig.length)).toBe('\n\n' + CABECALHO_CONFERENCIA + '\n- I10 – DESCRICAO-A: consta na tabela.');
  });
  it('não duplica linhas em branco quando a resposta já termina com quebra de linha', () => {
    expect(anexarConferencia(orig + '\n', falsa).slice(orig.length)).toBe('\n\n' + CABECALHO_CONFERENCIA + '\n- I10 – DESCRICAO-A: consta na tabela.');
    expect(anexarConferencia(orig + '\n\n', falsa).slice(orig.length)).toBe('\n\n' + CABECALHO_CONFERENCIA + '\n- I10 – DESCRICAO-A: consta na tabela.');
  });
  it('resposta sem CID, vazia ou truncada no meio: sem CID não muda; truncada com CID recebe o bloco mesmo assim', () => {
    expect(anexarConferencia('Sem sigla nenhuma', falsa)).toBe('Sem sigla nenhuma');
    expect(anexarConferencia('', falsa)).toBe('');
    const truncada = 'CID-10: I10 – Hipertensão esse'; // cortada pelo limite de tokens
    const out = anexarConferencia(truncada, falsa);
    expect(out.startsWith(truncada)).toBe(true);
    expect(out).toContain('- I10 – DESCRICAO-A: consta na tabela.');
  });
});

describe('removerConferencia (histórico do chat)', () => {
  it('tira o bloco e devolve exatamente o texto original', () => {
    const orig = 'Texto do modelo.\nCID-10: I10 – x';
    expect(removerConferencia(anexarConferencia(orig, falsa))).toBe(orig);
  });
  it('sem bloco, devolve igual', () => { expect(removerConferencia('qualquer texto')).toBe('qualquer texto'); });
});
