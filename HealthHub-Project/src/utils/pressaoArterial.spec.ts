import { describe, expect, it } from 'vitest';
import { lerPressao, nivelPressao } from './pressaoArterial';
import { getVitalStatus } from './vitalStatus';
import fixtures from '../../../limiares-fixtures.json';

describe('lerPressao', () => {
  it('aceita 120/80, 120x80, 120 / 80 e com espaços nas bordas', () => {
    expect(lerPressao('120/80')).toEqual({ pas: 120, pad: 80 });
    expect(lerPressao('120x80')).toEqual({ pas: 120, pad: 80 });
    expect(lerPressao('120X80')).toEqual({ pas: 120, pad: 80 });
    expect(lerPressao('120 / 80')).toEqual({ pas: 120, pad: 80 });
    expect(lerPressao(' 90/60 ')).toEqual({ pas: 90, pad: 60 });
  });
  it('formato inválido ou fora de 30 a 300 é desconhecida (null), sem erro', () => {
    for (const t of ['90', 'abc', '120/', '/80', '', '300/20', '29/80', '1200/80', '120/80/70', '12/8']) {
      expect(lerPressao(t), t).toBeNull();
    }
    expect(lerPressao(null)).toBeNull();
    expect(lerPressao(undefined)).toBeNull();
  });
  it('limites de 30 e 300 valem', () => {
    expect(lerPressao('300/30')).toEqual({ pas: 300, pad: 30 });
    expect(lerPressao('301/80')).toBeNull();
  });
});

describe('nivelPressao (esperados digitados da tabela)', () => {
  const casos: [number, number, string][] = [
    [90, 60, 'critical'], [91, 60, 'warning'], [100, 60, 'warning'], [101, 70, 'normal'], [139, 89, 'normal'],
    [140, 80, 'warning'], [120, 90, 'warning'], [179, 119, 'warning'], [180, 80, 'critical'], [120, 120, 'critical'], [220, 130, 'critical'],
  ];
  for (const [pas, pad, esperado] of casos) it(`${pas}/${pad} = ${esperado}`, () => expect(nivelPressao(pas, pad)).toBe(esperado));
});

describe('paridade: casos compartilhados (limiares-fixtures.json)', () => {
  type Caso = { id: string; entrada: { fc?: number; spo2?: number; temp?: number; pa?: string }; esperado: string };
  for (const c of fixtures.casos as Caso[]) {
    it(c.id, () => {
      const e = c.entrada;
      const sinais = [{
        id: '1', created_at: '2026-11-05T00:00:00Z',
        frequencia_cardiaca: e.fc === undefined ? '' : String(e.fc),
        saturacao_oxigenio: e.spo2 === undefined ? '' : String(e.spo2),
        temperatura: e.temp === undefined ? '' : String(e.temp),
        pressao_arterial: e.pa ?? '',
      }];
      expect(getVitalStatus(sinais, true)).toBe(c.esperado);
    });
  }
});
