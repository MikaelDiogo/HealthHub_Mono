import { describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ default: { get: vi.fn() } }));
vi.mock('./chatService', () => ({ chatService: { onFilaChanged: () => () => {} } }));

import { formatDuracao, tempoAtras } from './metricas';
import { proximaSenha, type FilaPaciente } from '../context/CareContext';

describe('formatDuracao', () => {
  it('usa a unidade que se lê de relance', () => {
    expect(formatDuracao(null)).toBe('—');
    expect(formatDuracao(42)).toBe('42 min');
    expect(formatDuracao(60)).toBe('1 h');
    expect(formatDuracao(200)).toBe('3 h 20 min');
    expect(formatDuracao(38199)).toBe('26 d 12 h');
    expect(formatDuracao(2880)).toBe('2 d');
  });
});

describe('tempoAtras', () => {
  const agora = new Date('2026-10-28T12:00:00Z');
  it('descreve a recência em palavras', () => {
    expect(tempoAtras('2026-10-28T08:00:00Z', agora)).toBe('hoje');
    expect(tempoAtras('2026-10-27T08:00:00Z', agora)).toBe('ontem');
    expect(tempoAtras('2026-10-16T12:00:00Z', agora)).toBe('há 12 dias');
    expect(tempoAtras('2026-08-28T12:00:00Z', agora)).toBe('há 2 meses');
  });
});

describe('proximaSenha', () => {
  const f = (senha: string) => ({ senha } as FilaPaciente);
  it('continua da maior senha da esteira (não repete após recarregar)', () => {
    expect(proximaSenha([])).toBe('PR-001');
    expect(proximaSenha([f('PR-001'), f('PR-007'), f('PR-003')])).toBe('PR-008');
    expect(proximaSenha([f('XX-099'), f('PR-002')])).toBe('PR-003');
  });
});
