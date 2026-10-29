import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RegistrarEventoService } from './registrar-evento.service';

// Registro de rastreabilidade: quem fez o quê e quando na esteira.
// NÃO atribui, sugere nem valida cor ou prioridade: só guarda o que o profissional fez.
function montar() {
  const repo = { registrar: vi.fn().mockResolvedValue(undefined), listarPorPaciente: vi.fn() };
  return { service: new RegistrarEventoService(repo as any), repo };
}

describe('RegistrarEventoService', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('grava o evento com autor (id e perfil), status, cor e justificativa', async () => {
    const { service, repo } = montar();
    await service.registrar({
      tipo: 'classificado', paciente_id: 'p1', fila_id: 'f1',
      status_anterior: 'Em Triagem (Enfermeiro)', status_novo: 'Aguardando Atendimento',
      gravidade: 'Verde', justificativa: 'texto fictício', usuario: { id: 'u1', role: 'enfermeiro' },
    });
    expect(repo.registrar).toHaveBeenCalledWith(expect.objectContaining({
      tipo: 'classificado', paciente_id: 'p1', fila_id: 'f1', gravidade: 'Verde',
      justificativa: 'texto fictício', usuario_id: 'u1', usuario_role: 'enfermeiro',
    }));
  });

  it('sem usuário informado, grava autor nulo (nada é inventado)', async () => {
    const { service, repo } = montar();
    await service.registrar({ tipo: 'admitido', paciente_id: 'p1' });
    const dado = repo.registrar.mock.calls[0][0];
    expect(dado.usuario_id).toBeNull();
    expect(dado.usuario_role).toBeNull();
  });

  it('justificativa vazia ou só espaços não é gravada', async () => {
    const { service, repo } = montar();
    await service.registrar({ tipo: 'classificado', paciente_id: 'p1', gravidade: 'Azul', justificativa: '   ' });
    expect(repo.registrar.mock.calls[0][0].justificativa).toBeNull();
  });

  it('falha ao gravar o evento NÃO derruba a ação clínica: o erro vai para o log do servidor', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { service, repo } = montar();
    repo.registrar.mockRejectedValue(new Error('banco indisponível'));
    await expect(service.registrar({ tipo: 'alta', paciente_id: 'p1' })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});

// Não prova: que o evento chega ao banco (isso é a execução real, em logs/); que o registro é transacional
// com a ação (não é: é "melhor esforço"); nem qualquer fidelidade a protocolo clínico.
