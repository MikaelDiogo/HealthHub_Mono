import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../../shared/decorators/roles.decorator';
import { UpdateFilaDto } from '../fila/presentation/dtos/update-fila.dto';
import { CreateSinaisVitaisService } from '../sinais-vitais/application/create-sinais-vitais.service';
import { EventosController } from './presentation/eventos.controller';

describe('UpdateFilaDto — justificativa opcional da classificação', () => {
  const erros = async (o: object) => (await validate(plainToInstance(UpdateFilaDto, o))).map((e) => e.property);
  it('aceita sem justificativa e com justificativa curta', async () => {
    expect(await erros({ status: 'Aguardando Atendimento', gravidade: 'Verde' })).toEqual([]);
    expect(await erros({ status: 'Aguardando Atendimento', gravidade: 'Verde', justificativa: 'texto fictício' })).toEqual([]);
  });
  it('recusa justificativa com mais de 500 caracteres', async () => {
    expect(await erros({ status: 'Aguardando Atendimento', gravidade: 'Verde', justificativa: 'x'.repeat(501) })).toContain('justificativa');
  });
});

describe('Sinais vitais registram evento com o autor', () => {
  it('registro válido → "sinais_registrados"; registro vazio → recusado e SEM evento', async () => {
    const repo = { createAndSave: vi.fn().mockResolvedValue({ id: 'sv-1' }), findAllByPatient: vi.fn(), findLatestByPatient: vi.fn() };
    const eventos = { registrar: vi.fn().mockResolvedValue(undefined) };
    const svc = new CreateSinaisVitaisService(repo as any, eventos as any);
    await svc.execute('pac-1', { frequencia_cardiaca: 72 } as any, { id: 'u-enf', role: 'enfermeiro' });
    expect(eventos.registrar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'sinais_registrados', paciente_id: 'pac-1', usuario: { id: 'u-enf', role: 'enfermeiro' } }));
    eventos.registrar.mockClear();
    await expect(svc.execute('pac-1', {} as any)).rejects.toBeTruthy();
    expect(eventos.registrar).not.toHaveBeenCalled();
  });
});

describe('EventosController — só médico e enfermeiro leem o histórico', () => {
  it('GET patients/:id/eventos restrito a médico e enfermeiro', () => {
    expect(Reflect.getMetadata(ROLES_KEY, EventosController.prototype.listar)).toEqual(['medico', 'enfermeiro']);
  });
});

// Não prova: o guard HTTP real (testado à parte); a leitura no banco real (execução em logs/).
