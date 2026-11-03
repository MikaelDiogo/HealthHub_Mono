import { describe, it, expect } from 'vitest';
import { alertasSinaisVitaisAtivos, motivoCritico } from './calcular-metricas';

describe('chave ALERTAS_SINAIS_VITAIS (Opção B)', () => {
  it('padrão: ligada (comportamento atual preservado)', () => {
    expect(alertasSinaisVitaisAtivos({})).toBe(true);
    expect(alertasSinaisVitaisAtivos({ ALERTAS_SINAIS_VITAIS: 'true' })).toBe(true);
  });
  it('só o valor "false" desliga', () => {
    expect(alertasSinaisVitaisAtivos({ ALERTAS_SINAIS_VITAIS: 'false' })).toBe(false);
    expect(alertasSinaisVitaisAtivos({ ALERTAS_SINAIS_VITAIS: '0' })).toBe(true);
  });
  it('ligada: os limiares atuais continuam gerando motivo crítico (valores inalterados)', () => {
    expect(motivoCritico({ saturacao_oxigenio: 91 }, true)).toContain('SpO₂ 91%');
    expect(motivoCritico({ frequencia_cardiaca: 101 }, true)).toContain('FC 101');
    expect(motivoCritico({ temperatura: 38.6 }, true)).toContain('Temperatura 38.6');
    expect(motivoCritico({ saturacao_oxigenio: 92, frequencia_cardiaca: 60, temperatura: 38.5 }, true)).toBeNull();
  });
  it('desligada: nenhum motivo, mesmo com valores que hoje são críticos', () => {
    expect(motivoCritico({ saturacao_oxigenio: 80, frequencia_cardiaca: 150, temperatura: 41 }, false)).toBeNull();
  });
});
