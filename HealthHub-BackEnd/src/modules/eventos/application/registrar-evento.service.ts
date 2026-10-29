import { Inject, Injectable } from '@nestjs/common';
import { EVENTOS_REPOSITORY, IEventosRepository } from '../domain/eventos-repository.interface';
import type { TipoEvento } from '../domain/fila-evento.entity';

export interface UsuarioEvento {
  id?: string;
  role?: string;
}

export interface RegistrarEventoInput {
  tipo: TipoEvento;
  paciente_id: string;
  fila_id?: string;
  visita_id?: string;
  status_anterior?: string;
  status_novo?: string;
  gravidade?: string;
  justificativa?: string;
  usuario?: UsuarioEvento;
}

/**
 * Registro de rastreabilidade: guarda QUEM fez QUAL ação e QUANDO. Não calcula, sugere nem valida cor ou
 * prioridade. É "melhor esforço": se a gravação falhar, a ação clínica já feita não é desfeita nem
 * bloqueada; o erro vai para o log do servidor.
 */
@Injectable()
export class RegistrarEventoService {
  constructor(
    @Inject(EVENTOS_REPOSITORY)
    private readonly repository: IEventosRepository,
  ) {}

  async registrar(input: RegistrarEventoInput): Promise<void> {
    try {
      const justificativa = input.justificativa?.trim();
      await this.repository.registrar({
        paciente_id: input.paciente_id,
        visita_id: input.visita_id ?? null,
        fila_id: input.fila_id ?? null,
        tipo: input.tipo,
        status_anterior: input.status_anterior ?? null,
        status_novo: input.status_novo ?? null,
        gravidade: input.gravidade ?? null,
        justificativa: justificativa ? justificativa : null,
        usuario_id: input.usuario?.id ?? null,
        usuario_role: input.usuario?.role ?? null,
      });
    } catch (err: any) {
      console.error('[HealthHub] Falha ao registrar evento de rastreabilidade:', input.tipo, err?.message);
    }
  }
}
