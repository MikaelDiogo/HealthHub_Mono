import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilaPaciente } from './domain/fila-paciente.entity';
import { FILA_REPOSITORY } from './domain/fila-repository.interface';
import { TypeormFilaRepository } from './infrastructure/typeorm-fila.repository';
import { CreateFilaService } from './application/create-fila.service';
import { ListFilaService } from './application/list-fila.service';
import { UpdateFilaService } from './application/update-fila.service';
import { DeleteFilaService } from './application/delete-fila.service';
import { FilaController } from './presentation/fila.controller';
import { VisitasModule } from '../visitas/visitas.module';

@Module({
  imports: [TypeOrmModule.forFeature([FilaPaciente]), VisitasModule],
  controllers: [FilaController],
  providers: [
    CreateFilaService,
    ListFilaService,
    UpdateFilaService,
    DeleteFilaService,
    { provide: FILA_REPOSITORY, useClass: TypeormFilaRepository },
  ],
})
export class FilaModule {}
