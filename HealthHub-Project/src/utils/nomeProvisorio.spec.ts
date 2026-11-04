import { describe, expect, it } from 'vitest';
import { ehNomeProvisorio, nomeExibicao, NOME_PROVISORIO_PREVIEW, opcoesSexo, rotuloIdade, rotuloSexo } from './nomeProvisorio';

describe('ehNomeProvisorio (selo "Nome provisório")', () => {
  it('só é verdadeiro quando a marca vem como true', () => {
    expect(ehNomeProvisorio({ nome_provisorio: true })).toBe(true);
    expect(ehNomeProvisorio({ nome_provisorio: false })).toBe(false);
    expect(ehNomeProvisorio({})).toBe(false);
    expect(ehNomeProvisorio(null)).toBe(false);
    expect(ehNomeProvisorio(undefined)).toBe(false);
  });
});

describe('rotuloIdade', () => {
  it('idade ausente vira "—"', () => {
    expect(rotuloIdade(null)).toBe('—');
    expect(rotuloIdade(undefined)).toBe('—');
    expect(rotuloIdade('')).toBe('—');
  });
  it('idade preenchida, inclusive 0, é mostrada', () => {
    expect(rotuloIdade(34)).toBe('34 anos');
    expect(rotuloIdade(0)).toBe('0 anos');
  });
});

describe('nomeExibicao', () => {
  it('usa o nome do cadastro ou o da esteira', () => {
    expect(nomeExibicao({ nome_completo: 'FICTÍCIO-01' })).toBe('FICTÍCIO-01');
    expect(nomeExibicao({ nome: 'FICTÍCIO-02' })).toBe('FICTÍCIO-02');
  });
  it('registro sem nome não quebra: "Sem identificação (#xxxx)" com o início do id', () => {
    expect(nomeExibicao({ id: 'a1b2c3d4-0000', nome_completo: '  ' })).toBe('Sem identificação (#a1b2)');
    expect(nomeExibicao({ id: 'a1b2c3d4-0000', nome_completo: null })).toBe('Sem identificação (#a1b2)');
    expect(nomeExibicao({})).toBe('Sem identificação');
    expect(nomeExibicao(null)).toBe('Sem identificação');
  });
});

describe('sexo em lista (M/F)', () => {
  it('as opções são Masculino e Feminino, gravadas como M e F', () => {
    expect(opcoesSexo(undefined)).toEqual([{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]);
    expect(opcoesSexo('M')).toHaveLength(2);
  });
  it('valor antigo ("Outro") continua aparecendo no cadastro que já o tem', () => {
    expect(opcoesSexo('Outro')).toContainEqual({ value: 'Outro', label: 'Outro' });
    expect(rotuloSexo('Outro')).toBe('Outro');
  });
  it('rótulo por extenso e ausente vira "—"', () => {
    expect(rotuloSexo('M')).toBe('Masculino');
    expect(rotuloSexo('F')).toBe('Feminino');
    expect(rotuloSexo(null)).toBe('—');
    expect(rotuloSexo('')).toBe('—');
  });
});

describe('prévia do nome provisório', () => {
  it('segue o padrão pedido', () => {
    expect(NOME_PROVISORIO_PREVIEW).toBe('Paciente não identificado (#xxxx)');
  });
});
