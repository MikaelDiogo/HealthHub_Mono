import { Inject, Injectable } from '@nestjs/common';
import { FilaPaciente } from '../domain/fila-paciente.entity';
import { FILA_REPOSITORY, IFilaRepository } from '../domain/fila-repository.interface';
import { CreateFilaDto } from '../presentation/dtos/create-fila.dto';
import { RealtimeGateway } from '../../../shared/realtime/realtime.gateway';
import { RegistrarEventoService, UsuarioEvento } from '../../eventos/application/registrar-evento.service';

@Injectable()
export class CreateFilaService {
  constructor(
    @Inject(FILA_REPOSITORY)
    private readonly filaRepository: IFilaRepository,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly eventos: RegistrarEventoService,
  ) {}

  async execute(data: CreateFilaDto, usuario?: UsuarioEvento): Promise<FilaPaciente> {
    // Atômico: bloqueio da fila, recusa de duplicidade (409), senha PR-NNN gerada aqui (a enviada pelo cliente é ignorada),
    // entrada + visita + reativação do paciente na mesma transação.
    const { senha: _ignorada, motivo_visita, ...resto } = data;
    const entrada = await this.filaRepository.admitirAtomico(resto, motivo_visita);

    await this.eventos.registrar({ tipo: 'admitido', paciente_id: data.paciente_id, fila_id: entrada.id, status_novo: data.status, usuario });

    this.realtimeGateway.broadcastFilaChanged();

    return entrada;
  }
}
