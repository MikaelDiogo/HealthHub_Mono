import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPressao, pressaoCritica } from './pressao-arterial';
import { motivoCritico } from '../modules/metricas/application/calcular-metricas';

describe('lerPressao (mesma regra do frontend)', () => {
  it('aceita 120/80, 120x80, 120 / 80 e espaços nas bordas', () => {
    expect(lerPressao('120/80')).toEqual({ pas: 120, pad: 80 });
    expect(lerPressao('120x80')).toEqual({ pas: 120, pad: 80 });
    expect(lerPressao('120 / 80')).toEqual({ pas: 120, pad: 80 });
    expect(lerPressao(' 90/60 ')).toEqual({ pas: 90, pad: 60 });
  });
  it('inválida ou fora de 30 a 300 é null', () => {
    for (const t of ['90', 'abc', '120/', '/80', '', '300/20', '29/80', '1200/80']) expect(lerPressao(t), t).toBeNull();
    expect(lerPressao(null)).toBeNull();
    expect(lerPressao(undefined)).toBeNull();
  });
});

describe('pressaoCritica (esperados digitados da tabela)', () => {
  const casos: [number, number, boolean][] = [
    [90, 60, true], [91, 60, false], [100, 60, false], [101, 70, false], [139, 89, false],
    [140, 80, false], [120, 90, false], [179, 119, false], [180, 80, true], [120, 120, true], [220, 130, true],
  ];
  for (const [pas, pad, esperado] of casos) it(`${pas}/${pad} crítico = ${esperado}`, () => expect(pressaoCritica(pas, pad)).toBe(esperado));
});

describe('paridade com o frontend: casos compartilhados (limiares-fixtures.json), recorte crítico', () => {
  type Caso = { id: string; entrada: { fc?: number; spo2?: number; temp?: number; pa?: string }; esperado: string };
  const raiz = resolve(process.cwd(), '..', 'limiares-fixtures.json');
  const { casos } = JSON.parse(readFileSync(raiz, 'utf8')) as { casos: Caso[] };
  for (const c of casos) {
    it(c.id, () => {
      const motivo = motivoCritico({
        frequencia_cardiaca: c.entrada.fc, saturacao_oxigenio: c.entrada.spo2, temperatura: c.entrada.temp, pressao_arterial: c.entrada.pa,
      }, true);
      expect(motivo !== null).toBe(c.esperado === 'critical');
    });
  }
});

describe('motivoCritico com pressão', () => {
  it('motivo da pressão no formato "PA 190/120"', () => {
    expect(motivoCritico({ pressao_arterial: '190/120' })).toBe('PA 190/120');
    expect(motivoCritico({ pressao_arterial: '85/50' })).toBe('PA 85/50');
    expect(motivoCritico({ pressao_arterial: '190x120' })).toBe('PA 190/120');
  });
  it('pressão inválida não gera alerta nem erro', () => {
    expect(motivoCritico({ pressao_arterial: 'abc' })).toBeNull();
    expect(motivoCritico({ pressao_arterial: '' })).toBeNull();
    expect(motivoCritico({ pressao_arterial: null })).toBeNull();
  });
  it('vários motivos juntos', () => {
    expect(motivoCritico({ frequencia_cardiaca: 120, pressao_arterial: '190/120' })).toBe('FC 120 bpm · PA 190/120');
  });
});
