import { describe, expect, it } from 'vitest';
import { FONTE_POP, LIMIARES_CRITICOS as L, alertasSemFonteAtivos, limiarAtivo } from '../../../config/limiares-sinais-vitais';
import { motivoCritico } from './calcular-metricas';

describe('limiares críticos (rodada 3) e suas fontes', () => {
  it('valores', () => {
    expect(L.spo2.abaixoDe).toBe(92);
    expect(L.frequenciaCardiaca.abaixoDe).toBe(60);
    expect(L.frequenciaCardiaca.acimaDe).toBe(100);
    expect(L.temperatura.aPartirDe).toBe(39.1); // antes: > 38,5
    expect(L.pressaoArterial).toMatchObject({ pasAte: 90, pasDe: 180, padDe: 120 });
  });
  it('nenhum limiar está sem fonte', () => {
    for (const l of [L.spo2, L.frequenciaCardiaca, L.temperatura, L.pressaoArterial]) expect(l.fonte).toBeTruthy();
    expect(L.frequenciaCardiaca.fonte).toContain(FONTE_POP);
    expect(L.spo2.fonte).toContain('NEWS2');
    expect(L.temperatura.fonte).toContain('Anexo F');
    expect(L.pressaoArterial.fonte).toContain('Crise Hipertensiva');
  });
  it('a pressão crítica registra as três redações da crise hipertensiva', () => {
    const t = L.pressaoArterial.fonte_pressao_critica;
    expect(t).toContain('SBC');
    expect(t).toContain('Ministério da Saúde');
    expect(t).toContain('POP');
  });
});

describe('chave ALERTAS_SEM_FONTE', () => {
  it('padrão ligado; só "false" desliga', () => {
    expect(alertasSemFonteAtivos({})).toBe(true);
    expect(alertasSemFonteAtivos({ ALERTAS_SEM_FONTE: 'true' })).toBe(true);
    expect(alertasSemFonteAtivos({ ALERTAS_SEM_FONTE: '' })).toBe(true);
    expect(alertasSemFonteAtivos({ ALERTAS_SEM_FONTE: 'false' })).toBe(false);
  });
  it('limiar SINTÉTICO: com `false` só o que não tem fonte é desligado', () => {
    expect(limiarAtivo({ fonte: null }, true)).toBe(true);
    expect(limiarAtivo({ fonte: null }, false)).toBe(false);
    expect(limiarAtivo({ fonte: 'qualquer documento' }, true)).toBe(true);
    expect(limiarAtivo({ fonte: 'qualquer documento' }, false)).toBe(true);
  });
  it('o ambiente do processo é o padrão da leitura; hoje `false` não desliga nenhum alerta real', () => {
    const antes = process.env.ALERTAS_SEM_FONTE;
    try {
      process.env.ALERTAS_SEM_FONTE = 'false';
      expect(alertasSemFonteAtivos()).toBe(false);
      expect(motivoCritico({ saturacao_oxigenio: 90 })).toBe('SpO₂ 90%');
      expect(motivoCritico({ temperatura: 40 })).toBe('Temperatura 40 °C');
      expect(motivoCritico({ pressao_arterial: '190/120' })).toBe('PA 190/120');
      delete process.env.ALERTAS_SEM_FONTE;
      expect(alertasSemFonteAtivos()).toBe(true);
      expect(motivoCritico({ saturacao_oxigenio: 90 })).toBe('SpO₂ 90%');
    } finally {
      if (antes === undefined) delete process.env.ALERTAS_SEM_FONTE; else process.env.ALERTAS_SEM_FONTE = antes;
    }
  });
});

describe('motivoCritico: valores escritos à mão', () => {
  it('SpO₂ < 92, FC < 60 ou > 100, temperatura >= 39,1 são críticas', () => {
    expect(motivoCritico({ saturacao_oxigenio: 91 }, true)).toBe('SpO₂ 91%');
    expect(motivoCritico({ saturacao_oxigenio: 92 }, true)).toBeNull();
    expect(motivoCritico({ frequencia_cardiaca: 59 }, true)).toBe('FC 59 bpm');
    expect(motivoCritico({ frequencia_cardiaca: 101 }, true)).toBe('FC 101 bpm');
    expect(motivoCritico({ frequencia_cardiaca: 100 }, true)).toBeNull();
    expect(motivoCritico({ temperatura: 39.1 }, true)).toBe('Temperatura 39.1 °C');
    expect(motivoCritico({ temperatura: 39 }, true)).toBeNull(); // rodada 3
    expect(motivoCritico({ temperatura: 38.6 }, true)).toBeNull(); // rodada 3: antes era crítico
    expect(motivoCritico({ saturacao_oxigenio: 90, frequencia_cardiaca: 120, temperatura: 39.1 }, true)).toBe('SpO₂ 90% · FC 120 bpm · Temperatura 39.1 °C');
  });
  it('sem sinais: nenhum motivo', () => {
    expect(motivoCritico(undefined, true)).toBeNull();
    expect(motivoCritico({}, true)).toBeNull();
  });
});
