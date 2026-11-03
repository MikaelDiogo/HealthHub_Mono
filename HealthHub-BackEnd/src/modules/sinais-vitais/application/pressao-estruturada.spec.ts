import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSinaisVitaisService } from './create-sinais-vitais.service';
import { CreateSinaisVitaisDto } from '../presentation/dtos/create-sinais-vitais.dto';
import { LIMIARES_CRITICOS } from '../../../config/limiares-sinais-vitais';

function montar() {
  const repo = { createAndSave: vi.fn().mockImplementation(async (d) => ({ id: 'sv-1', ...d })), findAllByPatient: vi.fn(), findLatestByPatient: vi.fn() };
  return { service: new CreateSinaisVitaisService(repo as any, { registrar: vi.fn().mockResolvedValue(undefined) } as any), repo };
}
const erros = async (corpo: object) => (await validate(plainToInstance(CreateSinaisVitaisDto, corpo))).map((e) => e.property);

describe('Opção A — pressão arterial estruturada (sistólica e diastólica)', () => {
  it('só pressão estruturada já conta como "ao menos um sinal" e é gravada', async () => {
    const { service, repo } = montar();
    await service.execute('pac-1', { pressao_sistolica: 120, pressao_diastolica: 80 } as any);
    expect(repo.createAndSave).toHaveBeenCalledWith(expect.objectContaining({ pressao_sistolica: 120, pressao_diastolica: 80 }));
  });

  it('o campo texto antigo continua funcionando', async () => {
    const { service, repo } = montar();
    await service.execute('pac-1', { pressao_arterial: '120/80' } as any);
    expect(repo.createAndSave).toHaveBeenCalledWith(expect.objectContaining({ pressao_arterial: '120/80', pressao_sistolica: undefined }));
  });

  it('validação técnica mínima: inteiro, não negativo; nenhum teto clínico foi escolhido', async () => {
    expect(await erros({ pressao_sistolica: 120, pressao_diastolica: 80 })).toEqual([]);
    expect(await erros({ pressao_sistolica: -1 })).toContain('pressao_sistolica');
    expect(await erros({ pressao_diastolica: 80.5 })).toContain('pressao_diastolica');
    expect(await erros({ pressao_sistolica: 900 })).toEqual([]); // sem teto: decisão do autor
  });
});

describe('Opção A — limiares centralizados: valores inalterados', () => {
  it('a configuração do backend tem exatamente os valores que já estavam no código', () => {
    expect(LIMIARES_CRITICOS.spo2.criticoAbaixoDe).toBe(92);
    expect(LIMIARES_CRITICOS.frequenciaCardiaca).toMatchObject({ criticoAcimaDe: 100, criticoAbaixoDe: 60 });
    expect(LIMIARES_CRITICOS.temperatura.criticoAcimaDe).toBe(38.5);
  });
  it('nenhuma fonte clínica está registrada (continua pendente)', () => {
    expect([LIMIARES_CRITICOS.spo2.fonte, LIMIARES_CRITICOS.frequenciaCardiaca.fonte, LIMIARES_CRITICOS.temperatura.fonte]).toEqual([null, null, null]);
  });
});
