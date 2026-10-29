import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtPayload } from '../../../shared/guards/jwt-auth.guard';
import { CreateFilaService } from '../application/create-fila.service';
import { ListFilaService } from '../application/list-fila.service';
import { UpdateFilaService } from '../application/update-fila.service';
import { DeleteFilaService } from '../application/delete-fila.service';
import { DischargeFilaService } from '../application/discharge-fila.service';
import { CreateFilaDto } from './dtos/create-fila.dto';
import { UpdateFilaDto } from './dtos/update-fila.dto';

type AuthedRequest = Request & { user: JwtPayload };

@ApiTags('Esteira (fila)')
@ApiBearerAuth()
@Controller('fila')
export class FilaController {
  constructor(
    private readonly createFila: CreateFilaService,
    private readonly listFila: ListFilaService,
    private readonly updateFila: UpdateFilaService,
    private readonly deleteFila: DeleteFilaService,
    private readonly dischargeFila: DischargeFilaService,
  ) {}

  @ApiOperation({ summary: "Lista pacientes na esteira", description: "Perfis permitidos: medico, enfermeiro, recepcionista." })
  @Get()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  index() {
    return this.listFila.execute();
  }

  @ApiOperation({ summary: "Admite paciente na esteira", description: "Perfis permitidos: medico, enfermeiro, recepcionista." })
  @Post()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  create(@Body() body: CreateFilaDto, @Req() req: AuthedRequest) {
    return this.createFila.execute(body, { id: req.user.id, role: req.user.role });
  }

  // Atualização de status: apenas médico e enfermeiro
  @ApiOperation({ summary: "Altera etapa e/ou registra a cor escolhida manualmente (justificativa opcional)", description: "Perfis permitidos: medico, enfermeiro." })
  @Put(':id')
  @Roles('medico', 'enfermeiro')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateFilaDto, @Req() req: AuthedRequest) {
    return this.updateFila.execute(id, body, req.user.role, req.user.id);
  }

  // Remoção da fila: apenas médico
  @ApiOperation({ summary: "Remove paciente da esteira (sem alta)", description: "Perfis permitidos: medico." })
  @Delete(':id')
  @Roles('medico')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return this.deleteFila.execute(id, { id: req.user.id, role: req.user.role });
  }

  // Alta clínica: fecha a visita, inativa o paciente e remove da esteira.
  @ApiOperation({ summary: "Dá alta: fecha a visita e inativa o paciente", description: "Perfis permitidos: medico." })
  @Patch(':id/alta')
  @Roles('medico')
  @HttpCode(204)
  discharge(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedRequest) {
    return this.dischargeFila.execute(id, { id: req.user.id, role: req.user.role });
  }
}
