import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { UpdateFilaService } from './update-fila.service';
import type { IFilaRepository } from '../domain/fila-repository.interface';
import type { IPatientsRepository } from '../../patients/domain/patients-repository.interface';
import type { ISinaisVitaisRepository } from '../../sinais-vitais/domain/sinais-vitais-repository.interface';
import type { CloseVisitaService } from '../../visitas/application/close-visita.service';
import type { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';
import type { FilaPaciente } from '../domain/fila-paciente.entity';

// Regra: "Alta" é só do médico. O PATCH /fila/:id/alta já era restrito; este teste cobre o
// caminho PUT /fila/:id com status "Alta", que antes permitia ao enfermeiro encerrar a visita.
function montar() {
  const entrada = {
    id: 'fila-1', paciente_id: 'pac-1', nome: 'Paciente Teste', idade: 40, senha: 'S-1',
    chegada: '29/10/2026, 10:00', status: 'Em Consulta (Médico)', gravidade: 'Verde', created_at: new Date(),
  } as FilaPaciente;
  const filaRepository: IFilaRepository = {
    findAll: vi.fn(), findById: vi.fn().mockResolvedValue(entrada), findByPacienteId: vi.fn(),
    createAndSave: vi.fn(), save: vi.fn().mockImplementation(async (e) => e), remove: vi.fn(),
  };
  const patientsRepository: IPatientsRepository = {
    findByCpf: vi.fn(), findById: vi.fn(), findByIdWithVitals: vi.fn(), findAllWithVitals: vi.fn(),
    createAndSave: vi.fn(), save: vi.fn(), setAtivo: vi.fn(),
  };
  const sinaisVitaisRepository: ISinaisVitaisRepository = {
    createAndSave: vi.fn(), findAllByPatient: vi.fn(), findLatestByPatient: vi.fn().mockResolvedValue([{ id: 'sv-1' }]),
  };
  const closeVisita = { execute: vi.fn() } as unknown as CloseVisitaService;
  const realtime = { broadcastFilaChanged: vi.fn() } as unknown as RealtimeGateway;
  const service = new UpdateFilaService(filaRepository, patientsRepository, sinaisVitaisRepository, closeVisita, realtime, { registrar: vi.fn().mockResolvedValue(undefined) } as any);
  return { service, filaRepository, patientsRepository, closeVisita, entrada };
}

describe('UpdateFilaService — status "Alta" pelo PUT só para o médico', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enfermeiro recebe 403 e NADA é alterado (visita, paciente e fila intactos)', async () => {
    const { service, filaRepository, patientsRepository, closeVisita } = montar();
    await expect(service.execute('fila-1', { status: 'Alta' }, 'enfermeiro')).rejects.toBeInstanceOf(ForbiddenException);
    expect(closeVisita.execute).not.toHaveBeenCalled();
    expect(patientsRepository.setAtivo).not.toHaveBeenCalled();
    expect(filaRepository.save).not.toHaveBeenCalled();
  });

  it('recepcionista também recebe 403 (defesa em profundidade: o @Roles já o barra antes)', async () => {
    const { service, closeVisita } = montar();
    await expect(service.execute('fila-1', { status: 'Alta' }, 'recepcionista')).rejects.toBeInstanceOf(ForbiddenException);
    expect(closeVisita.execute).not.toHaveBeenCalled();
  });

  it('médico consegue: fecha a visita e inativa o paciente', async () => {
    const { service, closeVisita, patientsRepository } = montar();
    await service.execute('fila-1', { status: 'Alta' }, 'medico');
    expect(closeVisita.execute).toHaveBeenCalledWith('pac-1', 'Alta', 'Verde');
    expect(patientsRepository.setAtivo).toHaveBeenCalledWith('pac-1', false);
  });

  it('outros status continuam permitidos ao enfermeiro (não houve mudança de regra)', async () => {
    const { service, closeVisita } = montar();
    await service.execute('fila-1', { status: 'Em Observação' }, 'enfermeiro');
    expect(closeVisita.execute).not.toHaveBeenCalled();
  });
});

// Não prova: que o guard HTTP real aplica o @Roles na rota (isso é outro teste); nem a regra
// clínica de quem DEVE dar alta (decisão do autor e do orientador, mantida como já estava no PATCH).
