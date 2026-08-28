import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CreateSinaisVitaisService } from '../application/create-sinais-vitais.service';
import { GetVitalsHistoryService } from '../application/get-vitals-history.service';
import { GetCurrentVitalsService } from '../application/get-current-vitals.service';
import { CreateSinaisVitaisDto } from './dtos/create-sinais-vitais.dto';

@Controller()
export class SinaisVitaisController {
  constructor(
    private readonly createSinais: CreateSinaisVitaisService,
    private readonly getHistory: GetVitalsHistoryService,
    private readonly getCurrent: GetCurrentVitalsService,
  ) {}

  @Post('sinais/:id')
  @Roles('medico', 'enfermeiro')
  create(@Param('id', ParseUUIDPipe) id: string, @Body() body: CreateSinaisVitaisDto) {
    return this.createSinais.execute(id, body);
  }

  @Get('sinais/:patientId/vitals')
  @Roles('medico', 'enfermeiro')
  history(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.getHistory.execute(patientId);
  }

  // Últimas 12 medições para o dashboard (rota consumida pelo frontend)
  @Get('patients/:id/vitals')
  @Roles('medico', 'enfermeiro')
  current(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCurrent.execute(id);
  }
}
