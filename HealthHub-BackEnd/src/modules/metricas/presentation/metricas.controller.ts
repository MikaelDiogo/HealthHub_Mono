import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { MetricasService } from '../application/metricas.service';
import { HistoricoPacientesService } from '../application/historico-pacientes.service';

@Controller('metricas')
export class MetricasController {
  constructor(
    private readonly metricas: MetricasService,
    private readonly historico: HistoricoPacientesService,
  ) {}

  /** Indicadores operacionais do pronto-atendimento (esteira, hoje, 30 dias, atenção agora) */
  @Get()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  index() {
    return this.metricas.execute();
  }

  /** Resumo do histórico de visitas por paciente (usado na readmissão) */
  @Get('historico-pacientes')
  @Roles('medico', 'enfermeiro', 'recepcionista')
  historicoPacientes() {
    return this.historico.execute();
  }
}
