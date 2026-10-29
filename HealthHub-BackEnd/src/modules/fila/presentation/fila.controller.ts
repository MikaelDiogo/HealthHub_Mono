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

@Controller('fila')
export class FilaController {
  constructor(
    private readonly createFila: CreateFilaService,
    private readonly listFila: ListFilaService,
    private readonly updateFila: UpdateFilaService,
    private readonly deleteFila: DeleteFilaService,
    private readonly dischargeFila: DischargeFilaService,
  ) {}

  @Get()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  index() {
    return this.listFila.execute();
  }

  @Post()
  @Roles('medico', 'enfermeiro', 'recepcionista')
  create(@Body() body: CreateFilaDto) {
    return this.createFila.execute(body);
  }

  // Atualização de status: apenas médico e enfermeiro
  @Put(':id')
  @Roles('medico', 'enfermeiro')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateFilaDto, @Req() req: AuthedRequest) {
    return this.updateFila.execute(id, body, req.user.role);
  }

  // Remoção da fila: apenas médico
  @Delete(':id')
  @Roles('medico')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteFila.execute(id);
  }

  // Alta clínica: fecha a visita, inativa o paciente e remove da esteira.
  @Patch(':id/alta')
  @Roles('medico')
  @HttpCode(204)
  discharge(@Param('id', ParseUUIDPipe) id: string) {
    return this.dischargeFila.execute(id);
  }
}
