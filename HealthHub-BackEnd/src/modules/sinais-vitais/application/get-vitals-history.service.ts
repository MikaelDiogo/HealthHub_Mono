import { Inject, Injectable } from '@nestjs/common';
import { SinaisVitais } from '../domain/sinais-vitais.entity';
import { ISinaisVitaisRepository, SINAIS_VITAIS_REPOSITORY } from '../domain/sinais-vitais-repository.interface';

@Injectable()
export class GetVitalsHistoryService {
  constructor(
    @Inject(SINAIS_VITAIS_REPOSITORY)
    private readonly sinaisRepository: ISinaisVitaisRepository,
  ) {}

  execute(patientId: string): Promise<SinaisVitais[]> {
    return this.sinaisRepository.findAllByPatient(patientId);
  }
}
