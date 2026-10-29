import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateFilaService } from './update-fila.service';
import type { IFilaRepository } from '../domain/fila-repository.interface';
import type { IPatientsRepository } from '../../patients/domain/patients-repository.interface';
import type { ISinaisVitaisRepository } from '../../sinais-vitais/domain/sinais-vitais-repository.interface';
import type { CloseVisitaService } from '../../visitas/application/close-visita.service';
import type { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';
import type { FilaPaciente } from '../domain/fila-paciente.entity';

function buildEntrada(): FilaPaciente {
  return {
    id: 'fila-1',
    paciente_id: 'pac-1',
    nome: 'Paciente Teste',
    idade: 40,
    senha: 'S-1',
    chegada: '14/10/2026, 10:00',
    status: 'Em Triagem (Enfermeiro)',
    gravidade: undefined,
    created_at: new Date(),
  } as FilaPaciente;
}

function buildService(sinaisExistem: boolean) {
  const entrada = buildEntrada();

  const filaRepository: IFilaRepository = {
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(entrada),
    findByPacienteId: vi.fn(),
    createAndSave: vi.fn(),
    save: vi.fn().mockImplementation(async (e) => e),
    remove: vi.fn(),
  };
  const patientsRepository: IPatientsRepository = {
    findByCpf: vi.fn(),
    findById: vi.fn(),
    findByIdWithVitals: vi.fn(),
    findAllWithVitals: vi.fn(),
    createAndSave: vi.fn(),
    save: vi.fn(),
    setAtivo: vi.fn(),
  };
  const sinaisVitaisRepository: ISinaisVitaisRepository = {
    createAndSave: vi.fn(),
    findAllByPatient: vi.fn(),
    findLatestByPatient: vi.fn().mockResolvedValue(sinaisExistem ? [{ id: 'sv-1' }] : []),
  };
  const closeVisita = { execute: vi.fn() } as unknown as CloseVisitaService;
  const realtimeGateway = { broadcastFilaChanged: vi.fn() } as unknown as RealtimeGateway;

  const service = new UpdateFilaService(filaRepository, patientsRepository, sinaisVitaisRepository, closeVisita, realtimeGateway);
  return { service, entrada, sinaisVitaisRepository };
}

describe('UpdateFilaService — categoria de Manchester só pelo enfermeiro, após sinais vitais', () => {
  beforeEach(() => vi.clearAllMocks());

  it('médico não pode atribuir a categoria de risco', async () => {
    const { service } = buildService(true);
    await expect(
      service.execute('fila-1', { status: 'Aguardando Atendimento', gravidade: 'Vermelho' }, 'medico'),
    ).rejects.toMatchObject({ response: { error: expect.stringMatching(/Apenas o enfermeiro/) } });
  });

  it('enfermeiro não pode classificar sem sinais vitais registrados antes', async () => {
    const { service } = buildService(false);
    await expect(
      service.execute('fila-1', { status: 'Aguardando Atendimento', gravidade: 'Amarelo' }, 'enfermeiro'),
    ).rejects.toMatchObject({ response: { error: expect.stringMatching(/sinais vitais/) } });
  });

  it('enfermeiro consegue classificar quando há sinais vitais registrados', async () => {
    const { service, entrada } = buildService(true);
    const atualizado = await service.execute(
      'fila-1',
      { status: 'Aguardando Atendimento', gravidade: 'Amarelo' },
      'enfermeiro',
    );
    expect(atualizado.gravidade).toBe('Amarelo');
    expect(entrada.gravidade).toBe('Amarelo');
  });

  it('atualizar apenas o status (sem gravidade) não exige papel nem sinais vitais', async () => {
    const { service } = buildService(false);
    const atualizado = await service.execute('fila-1', { status: 'Em Observação' }, 'medico');
    expect(atualizado.status).toBe('Em Observação');
  });
});
