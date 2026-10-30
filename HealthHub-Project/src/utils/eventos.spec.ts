import { describe, expect, it } from 'vitest';
import { AVISO_RASTREABILIDADE, rotuloEvento, rotuloPerfil } from './eventos';

describe('rotuloEvento', () => {
  it('descreve a ação em palavras, sem inventar categoria clínica', () => {
    expect(rotuloEvento({ tipo: 'admitido' })).toBe('Admitido na esteira');
    expect(rotuloEvento({ tipo: 'sinais_registrados' })).toBe('Sinais vitais registrados');
    expect(rotuloEvento({ tipo: 'triagem_iniciada' })).toBe('Triagem iniciada');
    expect(rotuloEvento({ tipo: 'consulta_iniciada' })).toBe('Consulta iniciada (chamada)');
    expect(rotuloEvento({ tipo: 'observacao_iniciada' })).toBe('Enviado à observação');
    expect(rotuloEvento({ tipo: 'alta' })).toBe('Alta');
    expect(rotuloEvento({ tipo: 'removido_da_fila' })).toBe('Removido da esteira');
  });

  it('classificação diz que a cor foi escolhida manualmente e qual foi', () => {
    expect(rotuloEvento({ tipo: 'classificado', gravidade: 'Verde' })).toBe('Cor registrada pelo enfermeiro: Verde');
  });

  it('classificação sem cor e tipo desconhecido não quebram', () => {
    expect(rotuloEvento({ tipo: 'classificado' })).toBe('Cor registrada pelo enfermeiro');
    expect(rotuloEvento({ tipo: 'algo_novo' })).toBe('algo_novo');
  });
});

describe('rotuloPerfil', () => {
  it('traduz os 3 perfis e admite autor não registrado (registros antigos)', () => {
    expect(rotuloPerfil('enfermeiro')).toBe('Enfermagem');
    expect(rotuloPerfil('medico')).toBe('Médico');
    expect(rotuloPerfil('recepcionista')).toBe('Recepção');
    expect(rotuloPerfil(null)).toBe('autor não registrado');
  });
});

describe('AVISO_RASTREABILIDADE', () => {
  it('deixa claro que a cor é manual, que não há controle de prazo e cita a classificação de risco', () => {
    expect(AVISO_RASTREABILIDADE).toMatch(/escolhida manualmente/i);
    expect(AVISO_RASTREABILIDADE).toMatch(/não classifica/i);
    expect(AVISO_RASTREABILIDADE).toMatch(/classificação de risco/i);
    expect(AVISO_RASTREABILIDADE).not.toMatch(new RegExp('manch' + 'ester', 'i'));
    expect(AVISO_RASTREABILIDADE).toMatch(/prazo/i);
  });
});

// Não prova: que a tela mostra esses rótulos (execução real, em capturas); nem qualquer fidelidade ao método.
