import { describe, expect, it } from 'vitest';
import { FONTE_POP, LIMIARES_CRITICOS as L, alertasSemFonteAtivos } from '../../../config/limiares-sinais-vitais';
import { motivoCritico } from './calcular-metricas';

describe('limiares críticos (valores não foram alterados) e suas fontes', () => {
  it('valores', () => {
    expect(L.spo2.abaixoDe).toBe(92);
    expect(L.frequenciaCardiaca.abaixoDe).toBe(60);
    expect(L.frequenciaCardiaca.acimaDe).toBe(100);
    expect(L.temperatura.acimaDe).toBe(38.5);
  });
  it('FC < 60 e > 100 têm fonte (POP.HC-UFTM-DENF.003 v6); SpO₂ < 92 e temperatura > 38,5 não têm (null)', () => {
    expect(L.frequenciaCardiaca.fonte).toContain(FONTE_POP);
    expect(L.spo2.fonte).toBeNull();
    expect(L.temperatura.fonte).toBeNull();
  });
});

describe('chave ALERTAS_SEM_FONTE', () => {
  it('padrão ligado; só "false" desliga', () => {
    expect(alertasSemFonteAtivos({})).toBe(true);
    expect(alertasSemFonteAtivos({ ALERTAS_SEM_FONTE: 'true' })).toBe(true);
    expect(alertasSemFonteAtivos({ ALERTAS_SEM_FONTE: '' })).toBe(true);
    expect(alertasSemFonteAtivos({ ALERTAS_SEM_FONTE: 'false' })).toBe(false);
  });
  it('o ambiente do processo é o padrão da leitura', () => {
    const antes = process.env.ALERTAS_SEM_FONTE;
    try {
      process.env.ALERTAS_SEM_FONTE = 'false';
      expect(alertasSemFonteAtivos()).toBe(false);
      expect(motivoCritico({ saturacao_oxigenio: 90 })).toBeNull();
      delete process.env.ALERTAS_SEM_FONTE;
      expect(alertasSemFonteAtivos()).toBe(true);
      expect(motivoCritico({ saturacao_oxigenio: 90 })).toBe('SpO₂ 90%');
    } finally {
      if (antes === undefined) delete process.env.ALERTAS_SEM_FONTE; else process.env.ALERTAS_SEM_FONTE = antes;
    }
  });
});

describe('motivoCritico — modo ligado (padrão): comportamento idêntico ao de sempre', () => {
  it('SpO₂ < 92, FC < 60 ou > 100 e temperatura > 38,5 são críticas', () => {
    expect(motivoCritico({ saturacao_oxigenio: 91 }, true)).toBe('SpO₂ 91%');
    expect(motivoCritico({ saturacao_oxigenio: 92 }, true)).toBeNull();
    expect(motivoCritico({ frequencia_cardiaca: 59 }, true)).toBe('FC 59 bpm');
    expect(motivoCritico({ frequencia_cardiaca: 101 }, true)).toBe('FC 101 bpm');
    expect(motivoCritico({ frequencia_cardiaca: 100 }, true)).toBeNull();
    expect(motivoCritico({ temperatura: 38.6 }, true)).toBe('Temperatura 38.6 °C');
    expect(motivoCritico({ temperatura: 38.5 }, true)).toBeNull();
    expect(motivoCritico({ saturacao_oxigenio: 90, frequencia_cardiaca: 120, temperatura: 39 }, true)).toBe('SpO₂ 90% · FC 120 bpm · Temperatura 39 °C');
  });
  it('sem sinais: nenhum motivo', () => {
    expect(motivoCritico(undefined, true)).toBeNull();
    expect(motivoCritico({}, true)).toBeNull();
  });
});

describe('motivoCritico — modo desligado (ALERTAS_SEM_FONTE=false): só os limiares com fonte', () => {
  it('SpO₂ < 92 e temperatura > 38,5 (sem fonte) deixam de aparecer', () => {
    expect(motivoCritico({ saturacao_oxigenio: 85 }, false)).toBeNull();
    expect(motivoCritico({ temperatura: 40 }, false)).toBeNull();
  });
  it('FC < 60 e > 100 (com fonte) continuam', () => {
    expect(motivoCritico({ frequencia_cardiaca: 59 }, false)).toBe('FC 59 bpm');
    expect(motivoCritico({ frequencia_cardiaca: 130 }, false)).toBe('FC 130 bpm');
  });
  it('só a FC é listada quando os três estão fora', () => {
    expect(motivoCritico({ saturacao_oxigenio: 90, frequencia_cardiaca: 120, temperatura: 39 }, false)).toBe('FC 120 bpm');
  });
});
