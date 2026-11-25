// Filtro do histórico: a saudação da tela e as mensagens do assistente com o nome do paciente não vão à Groq. Esperados escritos à mão a partir do pedido 7.
import { describe, it, expect } from 'vitest';
import { ehSaudacaoInicial, filtrarHistorico, nomeDoContexto } from './historico-seguro';

const NOME = 'José da Silva Fictício';

describe('ehSaudacaoInicial', () => {
  it.each([
    `Olá! Analisando **${NOME}**. Como posso ajudar neste caso?`,
    'Olá! Analisando **FICTÍCIO-06 912537**. Como posso ajudar neste caso?',
    'olá! analisando fulano de tal. como posso ajudar neste caso?',
    `  Olá! Analisando **Dr. A. B. Fictício**. Como posso ajudar neste caso?  `,
  ])('reconhece a saudação: %s', (t) => { expect(ehSaudacaoInicial(t)).toBe(true); });

  it.each([
    'Olá! Posso ajudar com este caso clínico.',
    'Analisando o caso: dor lombar. Como posso ajudar?',
    'Segue a análise. Olá! Analisando **X**. Como posso ajudar neste caso? Continuo aqui.',
    '',
  ])('não confunde com outras respostas: %s', (t) => { expect(ehSaudacaoInicial(t)).toBe(false); });
  it('valor que não é texto: false', () => { expect(ehSaudacaoInicial(undefined)).toBe(false); expect(ehSaudacaoInicial(42)).toBe(false); });
});

describe('nomeDoContexto', () => {
  it('usa nome_completo ou nome; ignora ausente, curto ou não texto', () => {
    expect(nomeDoContexto({ nome_completo: '  Ana Fictícia ' })).toBe('Ana Fictícia');
    expect(nomeDoContexto({ nome: 'Beto Fictício' })).toBe('Beto Fictício');
    expect(nomeDoContexto({})).toBeNull();
    expect(nomeDoContexto({ nome: 'Al' })).toBeNull();
    expect(nomeDoContexto({ nome: 123 })).toBeNull();
    expect(nomeDoContexto(null)).toBeNull();
  });
});

describe('filtrarHistorico', () => {
  const saud = { role: 'assistant', content: `Olá! Analisando **${NOME}**. Como posso ajudar neste caso?` };
  it('descarta a saudação do assistente, mesmo sem saber o nome', () => {
    expect(filtrarHistorico([saud, { role: 'user', content: 'dor' }], null)).toEqual([{ role: 'user', content: 'dor' }]);
  });
  it('com o nome conhecido, descarta mensagens do assistente que o contêm (sem diferenciar caixa e acentos)', () => {
    const h = [{ role: 'assistant', content: 'O paciente JOSE DA SILVA FICTICIO refere dor.' }, { role: 'assistant', content: 'Reavaliar em 1 hora.' }];
    expect(filtrarHistorico(h, NOME)).toEqual([{ role: 'assistant', content: 'Reavaliar em 1 hora.' }]);
  });
  it('sem o nome conhecido, só o padrão da saudação é aplicado (outra mensagem do assistente com o nome PASSA: limite informado)', () => {
    const h = [{ role: 'assistant', content: 'O paciente José da Silva Fictício refere dor.' }];
    expect(filtrarHistorico(h, null)).toEqual(h);
  });
  it('mensagens do usuário passam intactas, mesmo com o nome (texto livre segue como foi digitado)', () => {
    const h = [{ role: 'user', content: `Paciente ${NOME}, dor lombar` }];
    expect(filtrarHistorico(h, NOME)).toEqual(h);
  });
  it('histórico normal passa intacto e na mesma ordem; vazio e nulo viram lista vazia', () => {
    const h = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' }];
    expect(filtrarHistorico(h, NOME)).toEqual(h);
    expect(filtrarHistorico([], NOME)).toEqual([]);
    expect(filtrarHistorico(undefined, NOME)).toEqual([]);
    expect(filtrarHistorico(null, NOME)).toEqual([]);
  });
});
