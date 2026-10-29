import { describe, it, expect } from 'vitest';
import { calcularMetricas, diaBrasilia, motivoCritico } from './calcular-metricas';

const agora = new Date('2026-10-15T15:00:00Z'); // 12:00 em Brasília
const h = (horas: number) => new Date(agora.getTime() - horas * 3600_000);

describe('calcularMetricas', () => {
  it('conta readmissão quando a visita anterior terminou até 30 dias antes', () => {
    const m = calcularMetricas({
      agora,
      fila: [],
      ultimosSinais: {},
      visitas: [
        { paciente_id: 'a', chegada: h(24 * 20), alta: h(24 * 20 - 3), desfecho: 'Alta' },
        { paciente_id: 'a', chegada: h(24 * 5), alta: h(24 * 5 - 2), desfecho: 'Alta' }, // volta 15 dias depois
        { paciente_id: 'b', chegada: h(24 * 3), alta: h(24 * 3 - 1), desfecho: 'Alta' }, // primeira vez
      ],
    });
    expect(m.periodo30d.chegadas).toBe(3);
    expect(m.periodo30d.readmissoes).toBe(1);
    expect(m.periodo30d.permanenciaMediaMin).toBe(120); // (180 + 120 + 60) / 3
  });

  it('não conta como readmissão um retorno depois de 30 dias', () => {
    const m = calcularMetricas({
      agora, fila: [], ultimosSinais: {},
      visitas: [
        { paciente_id: 'a', chegada: h(24 * 50), alta: h(24 * 50 - 2), desfecho: 'Alta' },
        { paciente_id: 'a', chegada: h(24 * 2), alta: null, desfecho: 'Em Atendimento' },
      ],
    });
    expect(m.periodo30d.readmissoes).toBe(0);
  });

  it('usa o dia civil de Brasília para "hoje"', () => {
    // 01:30 UTC do dia 15 = 22:30 do dia 14 em Brasília
    expect(diaBrasilia(new Date('2026-10-15T01:30:00Z'))).toBe('2026-10-14');
    const m = calcularMetricas({
      agora, fila: [], ultimosSinais: {},
      visitas: [{ paciente_id: 'a', chegada: new Date('2026-10-15T01:30:00Z'), alta: null, desfecho: 'Em Atendimento' }],
    });
    expect(m.hoje.chegadas).toBe(0);
    expect(m.serie30d.at(-2)!.chegadas).toBe(1);
  });

  it('lista sinais críticos antes de espera longa e mede a maior espera', () => {
    const m = calcularMetricas({
      agora, visitas: [],
      fila: [
        { paciente_id: 'x', nome: 'Ana', status: 'Aguardando Triagem', created_at: h(1) },
        { paciente_id: 'y', nome: 'Beto', status: 'Em Consulta (Médico)', created_at: h(0.2) },
      ],
      ultimosSinais: { y: { saturacao_oxigenio: 89, frequencia_cardiaca: 80, temperatura: 36.5 } },
    });
    expect(m.atencao.map((a) => a.nome)).toEqual(['Beto', 'Ana']);
    expect(m.atencao[0].motivo).toBe('SpO₂ 89%');
    expect(m.esteira.maiorEspera?.minutos).toBe(60);
    expect(m.esteira.porRisco['Sem classificação']).toBe(2);
  });

  it('motivoCritico usa os mesmos limiares do frontend', () => {
    expect(motivoCritico({ frequencia_cardiaca: 59 })).toBe('FC 59 bpm');
    expect(motivoCritico({ temperatura: 38.5 })).toBeNull();
    expect(motivoCritico({ saturacao_oxigenio: 95, frequencia_cardiaca: 70, temperatura: 36 })).toBeNull();
  });
});
