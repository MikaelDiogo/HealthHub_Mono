import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { UpdateFilaService } from './update-fila.service';
import { CreateFilaService } from './create-fila.service';
import { DeleteFilaService } from './delete-fila.service';
import { DischargeFilaService } from './discharge-fila.service';
import type { FilaPaciente } from '../domain/fila-paciente.entity';

const enfermeiro = { id: 'u-enf', role: 'enfermeiro' };
const medico = { id: 'u-med', role: 'medico' };

function entrada(status: string, gravidade?: string): FilaPaciente {
  return { id: 'fila-1', paciente_id: 'pac-1', nome: 'TESTE A', idade: 34, senha: 'PR-001', chegada: '29/10/2026, 10:00', status, gravidade, created_at: new Date() } as FilaPaciente;
}
function repos(e: FilaPaciente, sinais = true) {
  return {
    fila: { findAll: vi.fn(), findById: vi.fn().mockResolvedValue(e), findByPacienteId: vi.fn().mockResolvedValue(null), createAndSave: vi.fn().mockImplementation(async (d) => ({ ...e, ...d })), save: vi.fn().mockImplementation(async (x) => x), remove: vi.fn() },
    pacientes: { setAtivo: vi.fn() } as any,
    sinais: { createAndSave: vi.fn(), findAllByPatient: vi.fn(), findLatestByPatient: vi.fn().mockResolvedValue(sinais ? [{ id: 'sv' }] : []) },
    visita: { execute: vi.fn() } as any,
    rt: { broadcastFilaChanged: vi.fn() } as any,
    eventos: { registrar: vi.fn().mockResolvedValue(undefined) },
  };
}
const up = (r: ReturnType<typeof repos>) => new UpdateFilaService(r.fila as any, r.pacientes, r.sinais as any, r.visita, r.rt, r.eventos as any);

describe('UpdateFilaService — registra quem fez cada etapa (autoria e horário vêm do evento)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('iniciar triagem → evento "triagem_iniciada" com o enfermeiro', async () => {
    const r = repos(entrada('Aguardando Triagem'));
    await up(r).execute('fila-1', { status: 'Em Triagem (Enfermeiro)' }, 'enfermeiro', enfermeiro.id);
    expect(r.eventos.registrar).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'triagem_iniciada', paciente_id: 'pac-1', fila_id: 'fila-1',
      status_anterior: 'Aguardando Triagem', status_novo: 'Em Triagem (Enfermeiro)', usuario: { id: 'u-enf', role: 'enfermeiro' },
    }));
  });

  it('classificar → evento "classificado" com a cor escolhida, a justificativa opcional e o autor', async () => {
    const r = repos(entrada('Em Triagem (Enfermeiro)'));
    await up(r).execute('fila-1', { status: 'Aguardando Atendimento', gravidade: 'Amarelo', justificativa: 'texto fictício' } as any, 'enfermeiro', enfermeiro.id);
    expect(r.eventos.registrar).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'classificado', gravidade: 'Amarelo', justificativa: 'texto fictício', usuario: { id: 'u-enf', role: 'enfermeiro' },
    }));
  });

  it('classificar sem justificativa: justificativa ausente (opcional)', async () => {
    const r = repos(entrada('Em Triagem (Enfermeiro)'));
    await up(r).execute('fila-1', { status: 'Aguardando Atendimento', gravidade: 'Verde' }, 'enfermeiro', enfermeiro.id);
    expect(r.eventos.registrar.mock.calls[0][0].justificativa).toBeUndefined();
  });

  it('chamar (Em Consulta) → "consulta_iniciada"; observação → "observacao_iniciada"', async () => {
    const r1 = repos(entrada('Aguardando Atendimento', 'Verde'));
    await up(r1).execute('fila-1', { status: 'Em Consulta (Médico)' }, 'medico', medico.id);
    expect(r1.eventos.registrar.mock.calls[0][0].tipo).toBe('consulta_iniciada');
    const r2 = repos(entrada('Em Consulta (Médico)', 'Verde'));
    await up(r2).execute('fila-1', { status: 'Em Observação' }, 'medico', medico.id);
    expect(r2.eventos.registrar.mock.calls[0][0].tipo).toBe('observacao_iniciada');
  });

  it('alta pelo PUT (médico) → "alta"; recusada ao enfermeiro e SEM evento', async () => {
    const r = repos(entrada('Em Consulta (Médico)', 'Verde'));
    await up(r).execute('fila-1', { status: 'Alta' }, 'medico', medico.id);
    expect(r.eventos.registrar.mock.calls[0][0].tipo).toBe('alta');
    const r2 = repos(entrada('Em Consulta (Médico)', 'Verde'));
    await expect(up(r2).execute('fila-1', { status: 'Alta' }, 'enfermeiro', enfermeiro.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(r2.eventos.registrar).not.toHaveBeenCalled();
  });

  it('classificação bloqueada (sem sinais vitais) não gera evento', async () => {
    const r = repos(entrada('Em Triagem (Enfermeiro)'), false);
    await expect(up(r).execute('fila-1', { status: 'Aguardando Atendimento', gravidade: 'Verde' }, 'enfermeiro', enfermeiro.id)).rejects.toBeTruthy();
    expect(r.eventos.registrar).not.toHaveBeenCalled();
  });
});

describe('Admissão, alta e remoção registram evento (a cor fica preservada mesmo ao sair da fila)', () => {
  it('admitir → "admitido" com o usuário e o status de entrada', async () => {
    const r = repos(entrada('Aguardando Triagem'));
    const svc = new CreateFilaService(r.fila as any, r.pacientes, { execute: vi.fn() } as any, r.rt, r.eventos as any);
    await svc.execute({ paciente_id: 'pac-1', nome: 'TESTE A', idade: 34, senha: 'PR-001', chegada: 'x', status: 'Aguardando Triagem' } as any, { id: 'u-rec', role: 'recepcionista' });
    expect(r.eventos.registrar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'admitido', paciente_id: 'pac-1', status_novo: 'Aguardando Triagem', usuario: { id: 'u-rec', role: 'recepcionista' } }));
  });

  it('alta (PATCH) → "alta" guardando a cor no momento da alta', async () => {
    const r = repos(entrada('Em Consulta (Médico)', 'Laranja'));
    const svc = new DischargeFilaService(r.fila as any, r.pacientes, r.visita, r.rt, r.eventos as any);
    await svc.execute('fila-1', medico);
    expect(r.eventos.registrar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'alta', gravidade: 'Laranja', usuario: medico }));
  });

  it('remover da fila → "removido_da_fila" guardando a cor (antes ela se perdia)', async () => {
    const r = repos(entrada('Aguardando Atendimento', 'Vermelho'));
    const svc = new DeleteFilaService(r.fila as any, r.rt, r.eventos as any);
    await svc.execute('fila-1', medico);
    expect(r.eventos.registrar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'removido_da_fila', gravidade: 'Vermelho', usuario: medico }));
    expect(r.fila.remove).toHaveBeenCalled();
  });
});

// Não prova: gravação no banco; transação; que a cor é "correta" (é a escolha manual do enfermeiro, sem motor
// de decisão e sem relação com o Protocolo de Manchester); nem tempos-alvo ou alerta de prazo (não existem).
