import { describe, it, expect, afterEach, vi } from 'vitest';
import { spo2Status, fcStatus, tempStatus, getVitalStatus } from './vitalStatus';

// Limiares exigidos: SpO2 < 95%, FC < 60 ou > 100, temperatura >= 37,8 °C
describe('spo2Status', () => {
  it('sinaliza abaixo de 95% (warning) e abaixo de 92% (critical)', () => {
    expect(spo2Status(99)).toBe('normal');
    expect(spo2Status(95)).toBe('normal');
    expect(spo2Status(94)).toBe('warning');
    expect(spo2Status(92)).toBe('warning');
    expect(spo2Status(91)).toBe('critical');
  });
});

describe('fcStatus', () => {
  it('sinaliza bradicardia (<60) e taquicardia (>100)', () => {
    expect(fcStatus(75)).toBe('normal');
    expect(fcStatus(59)).toBe('critical'); // bradicardia — antes não era sinalizada
    expect(fcStatus(60)).toBe('normal');
    expect(fcStatus(91)).toBe('warning');
    expect(fcStatus(101)).toBe('critical');
  });
});

describe('tempStatus', () => {
  it('sinaliza febre a partir de 37.8 (inclusive)', () => {
    expect(tempStatus(37.5)).toBe('normal');
    expect(tempStatus(37.8)).toBe('warning'); // limiar exato — antes ficava de fora
    expect(tempStatus(38.0)).toBe('warning');
    expect(tempStatus(38.6)).toBe('critical');
  });
});

// Opção B: chave VITE_ALERTAS_SINAIS_VITAIS. Valores dos limiares inalterados; "false" só desliga o julgamento.
describe('chave VITE_ALERTAS_SINAIS_VITAIS', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('padrão (sem a variável): alertas ligados', () => {
    expect(spo2Status(90)).toBe('critical');
    expect(getVitalStatus([{ saturacao_oxigenio: 90 } as any])).toBe('critical');
  });

  it('com "false": nenhum alerta (tudo "unknown"), mesmo para valores hoje críticos', () => {
    vi.stubEnv('VITE_ALERTAS_SINAIS_VITAIS', 'false');
    expect(spo2Status(80)).toBe('unknown');
    expect(fcStatus(150)).toBe('unknown');
    expect(tempStatus(41)).toBe('unknown');
    expect(getVitalStatus([{ saturacao_oxigenio: 80, frequencia_cardiaca: 150, temperatura: 41 } as any])).toBe('unknown');
  });
});
