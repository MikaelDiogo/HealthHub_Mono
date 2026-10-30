import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ListVisitasByPatientService } from '../application/list-visitas-by-patient.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CloseVisitaService } from '../application/close-visita.service';
import { CloseVisitaDto } from './dtos/close-visita.dto';

@ApiTags('Visitas')
@ApiBearerAuth()
@Controller()
export class VisitasController {
  constructor(
    private readonly listVisitasByPatient: ListVisitasByPatientService,
    private readonly closeVisita: CloseVisitaService,
  ) {}

  /** Histórico completo de visitas de um paciente */
  @ApiOperation({ summary: "Histórico de visitas do paciente", description: "Qualquer usuário autenticado." })
  @Get('patients/:id/visitas')
  async listByPatient(@Param('id', ParseUUIDPipe) pacienteId: string) {
    return this.listVisitasByPatient.execute(pacienteId);
  }

  /** Fecha a visita ativa de um paciente (desfecho manual) */
  @ApiOperation({ summary: "Fecha a visita aberta (só médico)", description: "Perfis permitidos: medico." })
  @Patch('patients/:id/visitas/fechar')
  @Roles('medico')
  async close(
    @Param('id', ParseUUIDPipe) pacienteId: string,
    @Body() dto: CloseVisitaDto,
  ) {
    return this.closeVisita.execute(
      pacienteId,
      dto.desfecho ?? 'Alta',
      dto.classificacao_risco,
      dto.observacoes,
    );
  }
}
