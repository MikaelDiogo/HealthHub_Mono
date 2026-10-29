import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CreatePatientService } from '../application/create-patient.service';
import { ListPatientsService } from '../application/list-patients.service';
import { ShowPatientService } from '../application/show-patient.service';
import { UpdatePatientService } from '../application/update-patient.service';
import { CreatePatientDto } from './dtos/create-patient.dto';
import { UpdatePatientDto } from './dtos/update-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(
    private readonly createPatient: CreatePatientService,
    private readonly listPatients: ListPatientsService,
    private readonly showPatient: ShowPatientService,
    private readonly updatePatient: UpdatePatientService,
  ) {}

  // Listagem restrita a profissionais autenticados.
  // ?ativo=true|false filtra pacientes ativos (na esteira ou nunca atendidos) ou
  // que já receberam alta (usado na tela de "resgatar" um paciente antigo).
  @Get()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  index(@Query('ativo') ativo?: string) {
    return this.listPatients.execute(ativo === undefined ? undefined : ativo === 'true');
  }

  @Post()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  create(@Body() body: CreatePatientDto) {
    return this.createPatient.execute(body);
  }

  // Apenas médico e enfermeiro acessam dados clínicos detalhados
  @Get(':id')
  @Roles('medico', 'enfermeiro')
  show(@Param('id', ParseUUIDPipe) id: string) {
    return this.showPatient.execute(id);
  }

  @Put(':id')
  @Roles('medico', 'enfermeiro')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdatePatientDto) {
    return this.updatePatient.execute(id, body);
  }
}
