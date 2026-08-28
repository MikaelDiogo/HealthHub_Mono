import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente } from './domain/paciente.entity';
import { PATIENTS_REPOSITORY } from './domain/patients-repository.interface';
import { TypeormPatientsRepository } from './infrastructure/typeorm-patients.repository';
import { CreatePatientService } from './application/create-patient.service';
import { ListPatientsService } from './application/list-patients.service';
import { ShowPatientService } from './application/show-patient.service';
import { UpdatePatientService } from './application/update-patient.service';
import { PatientsController } from './presentation/patients.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente])],
  controllers: [PatientsController],
  providers: [
    CreatePatientService,
    ListPatientsService,
    ShowPatientService,
    UpdatePatientService,
    { provide: PATIENTS_REPOSITORY, useClass: TypeormPatientsRepository },
  ],
  exports: [PATIENTS_REPOSITORY],
})
export class PatientsModule {}
