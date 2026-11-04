import { describe, expect, it } from 'vitest';
import { FONTE_POP, LIMIARES_SINAIS_VITAIS as L, alertasSemFonteAtivos } from './limiaresSinaisVitais';
import { fcStatus, getVitalStatus, spo2Status, tempStatus } from '../utils/vitalStatus';
import type { SinalVital } from '../types/patient';

const sv = (o: Partial<Record<'saturacao_oxigenio' | 'frequencia_cardiaca' | 'temperatura', string>>): SinalVital[] => [
  { id: '1', temperatura: o.temperatura ?? '', pressao_arterial: '', frequencia_cardiaca: o.frequencia_cardiaca ?? '', saturacao_oxigenio: o.saturacao_oxigenio ?? '', created_at: '2026-11-04T00:00:00Z' },
];

describe('valores dos limiares (não foram alterados)', () => {
  it('SpO₂ < 92 crítico e < 95 atenção', () => {
    expect(L.spo2.critico.abaixoDe).toBe(92);
    expect(L.spo2.atencao.abaixoDe).toBe(95);
  });
  it('FC < 60 ou > 100 crítica e > 90 atenção', () => {
    expect(L.frequenciaCardiaca.critico.abaixoDe).toBe(60);
    expect(L.frequenciaCardiaca.critico.acimaDe).toBe(100);
    expect(L.frequenciaCardiaca.atencao.acimaDe).toBe(90);
  });
  it('temperatura > 38,5 crítica e >= 37,8 atenção', () => {
    expect(L.temperatura.critico.acimaDe).toBe(38.5);
    expect(L.temperatura.atencao.aPartirDe).toBe(37.8);
  });
});

describe('fonte de cada limiar', () => {
  it('têm fonte (POP.HC-UFTM-DENF.003 v6): FC < 60 e > 100, SpO₂ < 95 e temperatura >= 37,8', () => {
    for (const l of [L.frequenciaCardiaca.critico, L.spo2.atencao, L.temperatura.atencao]) {
      expect(l.fonte).toContain(FONTE_POP);
    }
  });
  it('sem fonte registrada (null): FC > 90, temperatura > 38,5 e SpO₂ < 92', () => {
    expect(L.frequenciaCardiaca.atencao.fonte).toBeNull();
    expect(L.temperatura.critico.fonte).toBeNull();
    expect(L.spo2.critico.fonte).toBeNull();
  });
});

describe('chave VITE_ALERTAS_SEM_FONTE', () => {
  it('padrão ligado; só "false" desliga', () => {
    expect(alertasSemFonteAtivos(undefined)).toBe(true);
    expect(alertasSemFonteAtivos('true')).toBe(true);
    expect(alertasSemFonteAtivos('')).toBe(true);
    expect(alertasSemFonteAtivos('false')).toBe(false);
  });
});

describe('modo ligado (padrão): comportamento idêntico ao de sempre', () => {
  it('métricas individuais', () => {
    expect(spo2Status(91, true)).toBe('critical');
    expect(spo2Status(94, true)).toBe('warning');
    expect(fcStatus(91, true)).toBe('warning');
    expect(fcStatus(101, true)).toBe('critical');
    expect(fcStatus(59, true)).toBe('critical');
    expect(tempStatus(38.6, true)).toBe('critical');
    expect(tempStatus(37.8, true)).toBe('warning');
  });
  it('status geral', () => {
    expect(getVitalStatus(sv({ frequencia_cardiaca: '91' }), true)).toBe('warning');
    expect(getVitalStatus(sv({ temperatura: '38.6' }), true)).toBe('critical');
    expect(getVitalStatus(sv({ saturacao_oxigenio: '91' }), true)).toBe('critical');
    expect(getVitalStatus(sv({ saturacao_oxigenio: '98', frequencia_cardiaca: '72', temperatura: '36.5' }), true)).toBe('normal');
    expect(getVitalStatus(undefined, true)).toBe('unknown');
  });
});

describe('modo desligado (VITE_ALERTAS_SEM_FONTE=false): só os limiares com fonte alertam', () => {
  it('FC > 90 (sem fonte) deixa de alertar; FC < 60 e > 100 (com fonte) continuam', () => {
    expect(fcStatus(91, false)).toBe('normal');
    expect(fcStatus(100, false)).toBe('normal');
    expect(fcStatus(101, false)).toBe('critical');
    expect(fcStatus(59, false)).toBe('critical');
  });
  it('temperatura > 38,5 (sem fonte) deixa de ser crítica; >= 37,8 (com fonte) continua alertando', () => {
    expect(tempStatus(38.6, false)).toBe('warning');
    expect(tempStatus(37.8, false)).toBe('warning');
    expect(tempStatus(37.7, false)).toBe('normal');
  });
  it('SpO₂ < 92 (sem fonte) deixa de ser crítica; < 95 (com fonte) continua alertando', () => {
    expect(spo2Status(91, false)).toBe('warning');
    expect(spo2Status(94, false)).toBe('warning');
    expect(spo2Status(95, false)).toBe('normal');
  });
  it('status geral: só os alertas com fonte aparecem', () => {
    expect(getVitalStatus(sv({ frequencia_cardiaca: '95' }), false)).toBe('normal');
    expect(getVitalStatus(sv({ temperatura: '38.6' }), false)).toBe('warning');
    expect(getVitalStatus(sv({ saturacao_oxigenio: '90' }), false)).toBe('warning');
    expect(getVitalStatus(sv({ frequencia_cardiaca: '120' }), false)).toBe('critical');
  });
  it('sem sinais ou valores ausentes seguem como "unknown"', () => {
    expect(getVitalStatus(undefined, false)).toBe('unknown');
    expect(getVitalStatus(sv({}), false)).toBe('unknown');
  });
});
