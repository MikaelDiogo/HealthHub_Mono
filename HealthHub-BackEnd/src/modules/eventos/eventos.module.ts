import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilaEvento } from './domain/fila-evento.entity';
import { Visita } from '../visitas/domain/visita.entity';
import { EVENTOS_REPOSITORY } from './domain/eventos-repository.interface';
import { TypeormEventosRepository } from './infrastructure/typeorm-eventos.repository';
import { RegistrarEventoService } from './application/registrar-evento.service';
import { ListarEventosPacienteService } from './application/listar-eventos-paciente.service';
import { EventosController } from './presentation/eventos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FilaEvento, Visita])],
  controllers: [EventosController],
  providers: [
    RegistrarEventoService,
    ListarEventosPacienteService,
    { provide: EVENTOS_REPOSITORY, useClass: TypeormEventosRepository },
  ],
  exports: [RegistrarEventoService],
})
export class EventosModule {}
