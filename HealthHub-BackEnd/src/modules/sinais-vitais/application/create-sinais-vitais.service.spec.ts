import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSinaisVitaisService } from './create-sinais-vitais.service';
import { CreateSinaisVitaisDto } from '../presentation/dtos/create-sinais-vitais.dto';
import type { ISinaisVitaisRepository } from '../domain/sinais-vitais-repository.interface';

function montar() {
  const repo: ISinaisVitaisRepository = {
    createAndSave: vi.fn().mockImplementation(async (d) => ({ id: 'sv-1', ...d })),
    findAllByPatient: vi.fn(),
    findLatestByPatient: vi.fn(),
  };
  return { service: new CreateSinaisVitaisService(repo, { registrar: vi.fn().mockResolvedValue(undefined) } as any), repo };
}

describe('CreateSinaisVitaisService — registro vazio não conta como "sinais registrados"', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recusa {} com 400 e não grava nada', async () => {
    const { service, repo } = montar();
    await expect(service.execute('pac-1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.createAndSave).not.toHaveBeenCalled();
  });

  it('recusa corpo só com campos vazios (string vazia / nulo)', async () => {
    const { service, repo } = montar();
    await expect(service.execute('pac-1', { pressao_arterial: '', temperatura: undefined, frequencia_cardiaca: null } as any))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repo.createAndSave).not.toHaveBeenCalled();
  });

  it.each([
    ['frequência cardíaca', { frequencia_cardiaca: 72 }],
    ['saturação', { saturacao_oxigenio: 98 }],
    ['pressão arterial', { pressao_arterial: '120/80' }],
    ['temperatura', { temperatura: 36.5 }],
  ])('aceita um registro só com %s', async (_nome, corpo) => {
    const { service, repo } = montar();
    await expect(service.execute('pac-1', corpo as any)).resolves.toBeTruthy();
    expect(repo.createAndSave).toHaveBeenCalledTimes(1);
  });
});

describe('CreateSinaisVitaisDto — limites atuais mantidos', () => {
  const erros = async (obj: object) => (await validate(plainToInstance(CreateSinaisVitaisDto, obj))).map((e) => e.property);

  it.each([[24.9, true], [25, false], [45, false], [45.1, true]])('temperatura %s → recusada=%s', async (v, recusa) => {
    expect((await erros({ temperatura: v })).includes('temperatura')).toBe(recusa);
  });
  it.each([[-1, true], [0, false], [100, false], [101, true]])('SpO₂ %s → recusada=%s', async (v, recusa) => {
    expect((await erros({ saturacao_oxigenio: v })).includes('saturacao_oxigenio')).toBe(recusa);
  });
  it.each([[0, false], [300, false], [301, true]])('FC %s → recusada=%s', async (v, recusa) => {
    expect((await erros({ frequencia_cardiaca: v })).includes('frequencia_cardiaca')).toBe(recusa);
  });
});

// Não prova: que o ValidationPipe global transforma e valida o corpo na rota real; que a classificação
// de risco fica de fato bloqueada pela rota (isso depende do update-fila.service, já testado à parte);
// nem o valor clínico dos limites (sem fonte clínica documentada).
