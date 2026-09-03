import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ListVisitasByPatientService } from '../application/list-visitas-by-patient.service';
import { CloseVisitaService } from '../application/close-visita.service';
import { CloseVisitaDto } from './dtos/close-visita.dto';

@Controller()
export class VisitasController {
  constructor(
    private readonly listVisitasByPatient: ListVisitasByPatientService,
    private readonly closeVisita: CloseVisitaService,
  ) {}

  /** Histórico completo de visitas de um paciente */
  @Get('patients/:id/visitas')
  async listByPatient(@Param('id', ParseUUIDPipe) pacienteId: string) {
    return this.listVisitasByPatient.execute(pacienteId);
  }

  /** Fecha a visita ativa de um paciente (desfecho manual) */
  @Patch('patients/:id/visitas/fechar')
  async close(
    @Param('id', ParseUUIDPipe) pacienteId: string,
    @Body() dto: CloseVisitaDto,
  ) {
    return this.closeVisita.execute(
      pacienteId,
      dto.desfecho ?? 'Alta',
      dto.gravidade_manchester,
      dto.observacoes,
    );
  }
}
