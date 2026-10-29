import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { STATUS_ESTEIRA } from '../../domain/fila-valores';

export class CreateFilaDto {
  @IsUUID()
  paciente_id!: string;

  @IsString()
  @MaxLength(150)
  nome!: string;

  @Type(() => Number)
  @IsInt()
  idade!: number;

  @IsString()
  @MaxLength(20)
  senha!: string;

  @IsString()
  @MaxLength(30)
  chegada!: string;

  @IsString()
  @MaxLength(50)
  @IsIn(STATUS_ESTEIRA, { message: 'Status inválido para a admissão na esteira' })
  status!: string;

  @IsOptional()
  @IsString()
  motivo_visita?: string;
}
