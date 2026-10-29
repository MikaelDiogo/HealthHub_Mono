import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { MetricasService } from '../application/metricas.service';
import { HistoricoPacientesService } from '../application/historico-pacientes.service';

@ApiTags('Métricas')
@ApiBearerAuth()
@Controller('metricas')
export class MetricasController {
  constructor(
    private readonly metricas: MetricasService,
    private readonly historico: HistoricoPacientesService,
  ) {}

  /** Indicadores operacionais do pronto-atendimento (esteira, hoje, 30 dias, atenção agora) */
  @ApiOperation({ summary: "Métricas do painel (espera, chegadas, altas, permanência, readmissões)", description: "Perfis permitidos: medico, enfermeiro, recepcionista." })
  @Get()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  index() {
    return this.metricas.execute();
  }

  /** Resumo do histórico de visitas por paciente (usado na readmissão) */
  @ApiOperation({ summary: "Resumo da última visita por paciente", description: "Perfis permitidos: medico, enfermeiro, recepcionista." })
  @Get('historico-pacientes')
  @Roles('medico', 'enfermeiro', 'recepcionista')
  historicoPacientes() {
    return this.historico.execute();
  }
}
