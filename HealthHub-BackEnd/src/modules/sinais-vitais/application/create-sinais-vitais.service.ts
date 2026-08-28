import { Inject, Injectable } from '@nestjs/common';
import { SinaisVitais } from '../domain/sinais-vitais.entity';
import { ISinaisVitaisRepository, SINAIS_VITAIS_REPOSITORY } from '../domain/sinais-vitais-repository.interface';
import { CreateSinaisVitaisDto } from '../presentation/dtos/create-sinais-vitais.dto';

@Injectable()
export class CreateSinaisVitaisService {
  constructor(
    @Inject(SINAIS_VITAIS_REPOSITORY)
    private readonly sinaisRepository: ISinaisVitaisRepository,
  ) {}

  execute(patientId: string, data: CreateSinaisVitaisDto): Promise<SinaisVitais> {
    // Se a hora não vier, registra a atual no formato HHMM (paridade com o sistema legado)
    const agora = new Date();
    const hora =
      data.hora !== undefined
        ? Number(data.hora)
        : Number(`${agora.getHours()}${agora.getMinutes().toString().padStart(2, '0')}`);

    return this.sinaisRepository.createAndSave({
      patient_id: patientId,
      hora,
      frequencia_cardiaca: data.frequencia_cardiaca,
      saturacao_oxigenio: data.saturacao_oxigenio,
      pressao_arterial: data.pressao_arterial,
      temperatura: data.temperatura,
    });
  }
}
