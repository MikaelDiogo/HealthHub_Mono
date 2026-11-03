import { describe, it, expect, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator';
import { HealthController } from './health.controller';

describe('HealthController (GET /health)', () => {
  it('banco responde: devolve apenas status e estado do banco, sem dados', async () => {
    const ds = { query: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const r = await new HealthController(ds as any).check();
    expect(r).toEqual({ status: 'ok', database: 'up' });
    expect(ds.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('banco fora do ar: 503 com corpo mínimo, sem vazar a mensagem do erro', async () => {
    const ds = { query: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432 senha=segredo')) };
    const falha = await new HealthController(ds as any).check().catch((e) => e);
    expect(falha).toBeInstanceOf(ServiceUnavailableException);
    expect(falha.getStatus()).toBe(503);
    expect(falha.getResponse()).toEqual({ status: 'error', database: 'down' });
    expect(JSON.stringify(falha.getResponse())).not.toMatch(/ECONNREFUSED|segredo/);
  });

  it('a rota é pública (sem JWT)', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController.prototype.check)).toBe(true);
  });
});
