import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { ListarEventosPacienteService } from '../application/listar-eventos-paciente.service';

@ApiTags('Rastreabilidade')
@ApiBearerAuth()
@Controller()
export class EventosController {
  constructor(private readonly listarEventos: ListarEventosPacienteService) {}

  /** Linha do tempo de rastreabilidade do paciente (quem fez o quê e quando). Só leitura. */
  @ApiOperation({ summary: "Registro de eventos do paciente (autor, horário, cor e justificativa)", description: "Perfis permitidos: medico, enfermeiro." })
  @Get('patients/:id/eventos')
  @Roles('medico', 'enfermeiro')
  listar(@Param('id', ParseUUIDPipe) pacienteId: string) {
    return this.listarEventos.execute(pacienteId);
  }
}
