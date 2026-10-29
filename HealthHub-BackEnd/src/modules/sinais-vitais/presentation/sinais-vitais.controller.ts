import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../../../shared/guards/jwt-auth.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CreateSinaisVitaisService } from '../application/create-sinais-vitais.service';
import { GetVitalsHistoryService } from '../application/get-vitals-history.service';
import { GetCurrentVitalsService } from '../application/get-current-vitals.service';
import { CreateSinaisVitaisDto } from './dtos/create-sinais-vitais.dto';

@ApiTags('Sinais vitais')
@ApiBearerAuth()
@Controller()
export class SinaisVitaisController {
  constructor(
    private readonly createSinais: CreateSinaisVitaisService,
    private readonly getHistory: GetVitalsHistoryService,
    private readonly getCurrent: GetCurrentVitalsService,
  ) {}

  @ApiOperation({ summary: "Registra sinais vitais (ao menos um campo)", description: "Perfis permitidos: medico, enfermeiro." })
  @Post('sinais/:id')
  @Roles('medico', 'enfermeiro')
  create(@Param('id', ParseUUIDPipe) id: string, @Body() body: CreateSinaisVitaisDto, @Req() req: Request & { user: JwtPayload }) {
    return this.createSinais.execute(id, body, { id: req.user.id, role: req.user.role });
  }

  @ApiOperation({ summary: "Histórico de sinais vitais do paciente", description: "Perfis permitidos: medico, enfermeiro." })
  @Get('sinais/:patientId/vitals')
  @Roles('medico', 'enfermeiro')
  history(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.getHistory.execute(patientId);
  }

  // Últimas 12 medições para o dashboard (rota consumida pelo frontend)
  @ApiOperation({ summary: "Última leitura de sinais vitais", description: "Perfis permitidos: medico, enfermeiro." })
  @Get('patients/:id/vitals')
  @Roles('medico', 'enfermeiro')
  current(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCurrent.execute(id);
  }
}
