import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SinaisVitais } from './domain/sinais-vitais.entity';
import { SINAIS_VITAIS_REPOSITORY } from './domain/sinais-vitais-repository.interface';
import { TypeormSinaisVitaisRepository } from './infrastructure/typeorm-sinais-vitais.repository';
import { CreateSinaisVitaisService } from './application/create-sinais-vitais.service';
import { GetVitalsHistoryService } from './application/get-vitals-history.service';
import { GetCurrentVitalsService } from './application/get-current-vitals.service';
import { SinaisVitaisController } from './presentation/sinais-vitais.controller';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [TypeOrmModule.forFeature([SinaisVitais]), PatientsModule],
  controllers: [SinaisVitaisController],
  providers: [
    CreateSinaisVitaisService,
    GetVitalsHistoryService,
    GetCurrentVitalsService,
    { provide: SINAIS_VITAIS_REPOSITORY, useClass: TypeormSinaisVitaisRepository },
  ],
})
export class SinaisVitaisModule {}
