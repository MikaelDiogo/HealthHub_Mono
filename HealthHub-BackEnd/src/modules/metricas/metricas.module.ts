import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Visita } from '../visitas/domain/visita.entity';
import { FilaPaciente } from '../fila/domain/fila-paciente.entity';
import { SinaisVitais } from '../sinais-vitais/domain/sinais-vitais.entity';
import { MetricasService } from './application/metricas.service';
import { HistoricoPacientesService } from './application/historico-pacientes.service';
import { MetricasController } from './presentation/metricas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Visita, FilaPaciente, SinaisVitais])],
  controllers: [MetricasController],
  providers: [MetricasService, HistoricoPacientesService],
})
export class MetricasModule {}
