import { describe, expect, it } from 'vitest';
import { FONTE_POP, LIMIARES_SINAIS_VITAIS as L, alertasSemFonteAtivos, limiarAtivo } from './limiaresSinaisVitais';
import { fcStatus, getVitalStatus, pressaoStatus, spo2Status, tempStatus } from '../utils/vitalStatus';
import type { SinalVital } from '../types/patient';

const sv = (o: Partial<Record<'saturacao_oxigenio' | 'frequencia_cardiaca' | 'temperatura' | 'pressao_arterial', string>>): SinalVital[] => [
  { id: '1', temperatura: o.temperatura ?? '', pressao_arterial: o.pressao_arterial ?? '', frequencia_cardiaca: o.frequencia_cardiaca ?? '', saturacao_oxigenio: o.saturacao_oxigenio ?? '', created_at: '2026-11-04T00:00:00Z' },
];

describe('valores dos limiares (rodada 3)', () => {
  it('SpO₂ < 92 crítico e < 95 atenção', () => {
    expect(L.spo2.critico.abaixoDe).toBe(92);
    expect(L.spo2.atencao.abaixoDe).toBe(95);
  });
  it('FC < 60 ou > 100 crítica e > 90 atenção', () => {
    expect(L.frequenciaCardiaca.critico.abaixoDe).toBe(60);
    expect(L.frequenciaCardiaca.critico.acimaDe).toBe(100);
    expect(L.frequenciaCardiaca.atencao.acimaDe).toBe(90);
  });
  it('temperatura >= 39,1 crítica (antes > 38,5) e >= 37,8 atenção', () => {
    expect(L.temperatura.critico.aPartirDe).toBe(39.1);
    expect(L.temperatura.atencao.aPartirDe).toBe(37.8);
  });
  it('pressão: crítico PAS <= 90, PAS >= 180 ou PAD >= 120; atenção PAS 91 a 100, PAS >= 140 ou PAD >= 90', () => {
    expect(L.pressaoArterial.critico).toMatchObject({ pasAte: 90, pasDe: 180, padDe: 120 });
    expect(L.pressaoArterial.atencao).toMatchObject({ pasDe: 91, pasAte: 100, pasAcimaDe: 140, padDe: 90 });
  });
});

describe('fonte de cada limiar: nenhum está sem fonte', () => {
  it('todos têm fonte preenchida', () => {
    const todos = [L.spo2.critico, L.spo2.atencao, L.frequenciaCardiaca.critico, L.frequenciaCardiaca.atencao, L.temperatura.critico, L.temperatura.atencao, L.pressaoArterial.critico, L.pressaoArterial.atencao];
    for (const l of todos) expect(l.fonte).toBeTruthy();
  });
  it('fonte do número de cada sinal', () => {
    expect(L.frequenciaCardiaca.critico.fonte).toContain(FONTE_POP);
    expect(L.frequenciaCardiaca.atencao.fonte).toContain('SIRS');
    expect(L.spo2.critico.fonte).toContain('NEWS2');
    expect(L.spo2.atencao.fonte).toContain('Anexo H');
    expect(L.temperatura.critico.fonte).toContain('Anexo F');
    expect(L.temperatura.atencao.fonte).toContain('Anexo F');
    expect(L.pressaoArterial.critico.fonte).toContain('Crise Hipertensiva');
    expect(L.pressaoArterial.atencao.fonte).toContain('Quadro 3.4');
  });
  it('a pressão crítica registra as três redações da crise hipertensiva', () => {
    const t = L.pressaoArterial.critico.fonte_pressao_critica;
    expect(t).toContain('SBC');
    expect(t).toContain('Ministério da Saúde');
    expect(t).toContain('POP');
  });
});

describe('chave VITE_ALERTAS_SEM_FONTE', () => {
  it('padrão ligado; só "false" desliga', () => {
    expect(alertasSemFonteAtivos(undefined)).toBe(true);
    expect(alertasSemFonteAtivos('true')).toBe(true);
    expect(alertasSemFonteAtivos('')).toBe(true);
    expect(alertasSemFonteAtivos('false')).toBe(false);
  });
  it('limiar SINTÉTICO: com `false` só o que não tem fonte é desligado', () => {
    const semFonte = { fonte: null };
    const comFonte = { fonte: 'qualquer documento' };
    expect(limiarAtivo(semFonte, true)).toBe(true);
    expect(limiarAtivo(semFonte, false)).toBe(false);
    expect(limiarAtivo(comFonte, true)).toBe(true);
    expect(limiarAtivo(comFonte, false)).toBe(true);
  });
  it('hoje a chave não desliga nenhum alerta real: modo `false` dá o mesmo resultado que o padrão', () => {
    const casos = [
      sv({ frequencia_cardiaca: '95' }), sv({ temperatura: '39.1' }), sv({ saturacao_oxigenio: '91' }),
      sv({ frequencia_cardiaca: '120' }), sv({ pressao_arterial: '190/120' }), sv({ pressao_arterial: '150/95' }),
    ];
    for (const c of casos) expect(getVitalStatus(c, false)).toBe(getVitalStatus(c, true));
  });
});

describe('status geral (valores escritos à mão)', () => {
  it('métricas individuais', () => {
    expect(spo2Status(91, true)).toBe('critical');
    expect(spo2Status(94, true)).toBe('warning');
    expect(fcStatus(91, true)).toBe('warning');
    expect(fcStatus(101, true)).toBe('critical');
    expect(fcStatus(59, true)).toBe('critical');
    expect(tempStatus(38.6, true)).toBe('warning'); // rodada 3: antes era crítico (> 38,5)
    expect(tempStatus(39.1, true)).toBe('critical');
    expect(tempStatus(37.8, true)).toBe('warning');
    expect(pressaoStatus('190/120', true)).toBe('critical');
    expect(pressaoStatus('150/95', true)).toBe('warning');
  });
  it('status geral', () => {
    expect(getVitalStatus(sv({ frequencia_cardiaca: '91' }), true)).toBe('warning');
    expect(getVitalStatus(sv({ temperatura: '38.6' }), true)).toBe('warning');
    expect(getVitalStatus(sv({ temperatura: '39.1' }), true)).toBe('critical');
    expect(getVitalStatus(sv({ saturacao_oxigenio: '91' }), true)).toBe('critical');
    expect(getVitalStatus(sv({ saturacao_oxigenio: '98', frequencia_cardiaca: '72', temperatura: '36.5' }), true)).toBe('normal');
    expect(getVitalStatus(sv({ pressao_arterial: '190/120' }), true)).toBe('critical');
    expect(getVitalStatus(sv({ pressao_arterial: '85/50' }), true)).toBe('critical');
    expect(getVitalStatus(sv({ pressao_arterial: '130/85' }), true)).toBe('normal');
    expect(getVitalStatus(undefined, true)).toBe('unknown');
    expect(getVitalStatus(sv({}), true)).toBe('unknown');
    expect(getVitalStatus(sv({ pressao_arterial: 'abc' }), true)).toBe('unknown');
  });
  it('o pior nível vence: FC 105 com PA 150/95 é crítico pela FC', () => {
    expect(getVitalStatus(sv({ frequencia_cardiaca: '105', pressao_arterial: '150/95' }), true)).toBe('critical');
    expect(getVitalStatus(sv({ frequencia_cardiaca: '72', pressao_arterial: '150/95' }), true)).toBe('warning');
  });
});
