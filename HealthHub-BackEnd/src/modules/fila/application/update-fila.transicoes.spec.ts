import { describe, it, expect, vi } from 'vitest';
import { UpdateFilaService } from './update-fila.service';
import type { FilaPaciente } from '../domain/fila-paciente.entity';

// Documenta o comportamento ATUAL das transições de estado (fila-valores.ts: "regra de transição ainda não decidida").
// Não é uma especificação de regra clínica: se uma regra for decidida, estes testes devem mudar junto.
function montar(statusInicial: string) {
  const entrada = { id: 'fila-1', paciente_id: 'pac-1', nome: 'FICTÍCIO-01', idade: 40, senha: 'PR-001', chegada: 'x', status: statusInicial, created_at: new Date() } as FilaPaciente;
  const fila = { findById: vi.fn().mockResolvedValue(entrada), save: vi.fn().mockImplementation(async (e) => e) };
  const eventos = { registrar: vi.fn().mockResolvedValue(undefined) };
  const rt = { broadcastFilaChanged: vi.fn() };
  const svc = new UpdateFilaService(fila as any, {} as any, { findLatestByPatient: vi.fn().mockResolvedValue([{ id: 'sv' }]) } as any, { execute: vi.fn() } as any, rt as any, eventos as any);
  return { svc, entrada, fila, eventos };
}

describe('UpdateFilaService — saltos de estado (comportamento observado hoje)', () => {
  it('salto "Aguardando Triagem" → "Em Consulta (Médico)" é ACEITO e registra o evento de consulta', async () => {
    const { svc, entrada, eventos } = montar('Aguardando Triagem');
    const r = await svc.execute('fila-1', { status: 'Em Consulta (Médico)' }, 'medico', 'u-med');
    expect(r.status).toBe('Em Consulta (Médico)');
    expect(entrada.status).toBe('Em Consulta (Médico)');
    expect(eventos.registrar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'consulta_iniciada', status_anterior: 'Aguardando Triagem', status_novo: 'Em Consulta (Médico)' }));
  });

  it('salto "Aguardando Triagem" → "Em Observação" é aceito (qualquer perfil autorizado na rota)', async () => {
    const { svc } = montar('Aguardando Triagem');
    const r = await svc.execute('fila-1', { status: 'Em Observação' }, 'enfermeiro', 'u-enf');
    expect(r.status).toBe('Em Observação');
  });

  it('retroceder ("Em Consulta (Médico)" → "Aguardando Triagem") também é aceito', async () => {
    const { svc } = montar('Em Consulta (Médico)');
    const r = await svc.execute('fila-1', { status: 'Aguardando Triagem' }, 'medico', 'u-med');
    expect(r.status).toBe('Aguardando Triagem');
  });

  it('o que continua restrito: "Alta" pelo PUT só para médico (enfermeiro recebe 403 e o estado não muda)', async () => {
    const { svc, entrada } = montar('Em Consulta (Médico)');
    await expect(svc.execute('fila-1', { status: 'Alta' }, 'enfermeiro', 'u-enf')).rejects.toMatchObject({ status: 403 });
    expect(entrada.status).toBe('Em Consulta (Médico)');
  });
});
