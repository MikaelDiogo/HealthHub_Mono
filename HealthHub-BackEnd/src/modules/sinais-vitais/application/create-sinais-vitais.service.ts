import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SinaisVitais } from '../domain/sinais-vitais.entity';
import { ISinaisVitaisRepository, SINAIS_VITAIS_REPOSITORY } from '../domain/sinais-vitais-repository.interface';
import { CreateSinaisVitaisDto } from '../presentation/dtos/create-sinais-vitais.dto';
import { RegistrarEventoService, UsuarioEvento } from '../../eventos/application/registrar-evento.service';

@Injectable()
export class CreateSinaisVitaisService {
  constructor(
    @Inject(SINAIS_VITAIS_REPOSITORY)
    private readonly sinaisRepository: ISinaisVitaisRepository,
    private readonly eventos: RegistrarEventoService,
  ) {}

  async execute(patientId: string, data: CreateSinaisVitaisDto, usuario?: UsuarioEvento): Promise<SinaisVitais> {
    // Um registro sem nenhum sinal não conta como "sinais registrados" (isso liberaria a classificação de risco).
    const preenchido = (v: unknown) => v !== undefined && v !== null && v !== '';
    if (![data?.frequencia_cardiaca, data?.saturacao_oxigenio, data?.pressao_arterial, data?.temperatura].some(preenchido)) {
      throw new BadRequestException({ error: 'Informe ao menos um sinal vital (frequência cardíaca, SpO₂, pressão arterial ou temperatura).' });
    }

    // Se a hora não vier, registra a atual no formato HHMM (paridade com o sistema legado)
    const agora = new Date();
    const hora =
      data.hora !== undefined
        ? Number(data.hora)
        : Number(`${agora.getHours()}${agora.getMinutes().toString().padStart(2, '0')}`);

    const registro = await this.sinaisRepository.createAndSave({
      patient_id: patientId,
      hora,
      frequencia_cardiaca: data.frequencia_cardiaca,
      saturacao_oxigenio: data.saturacao_oxigenio,
      pressao_arterial: data.pressao_arterial,
      temperatura: data.temperatura,
    });

    // Rastreabilidade: quem registrou os sinais e quando (não guarda os valores, que já estão em sinais_vitais).
    await this.eventos.registrar({ tipo: 'sinais_registrados', paciente_id: patientId, usuario });

    return registro;
  }
}
