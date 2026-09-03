import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visita } from './domain/visita.entity';
import { VISITAS_REPOSITORY } from './domain/visitas-repository.interface';
import { TypeormVisitasRepository } from './infrastructure/typeorm-visitas.repository';
import { CreateVisitaService } from './application/create-visita.service';
import { CloseVisitaService } from './application/close-visita.service';
import { ListVisitasByPatientService } from './application/list-visitas-by-patient.service';
import { VisitasController } from './presentation/visitas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Visita])],
  controllers: [VisitasController],
  providers: [
    CreateVisitaService,
    CloseVisitaService,
    ListVisitasByPatientService,
    { provide: VISITAS_REPOSITORY, useClass: TypeormVisitasRepository },
  ],
  exports: [CreateVisitaService, CloseVisitaService],
})
export class VisitasModule {}
