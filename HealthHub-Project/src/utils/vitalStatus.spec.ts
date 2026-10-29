import { describe, it, expect } from 'vitest';
import { spo2Status, fcStatus, tempStatus } from './vitalStatus';

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
