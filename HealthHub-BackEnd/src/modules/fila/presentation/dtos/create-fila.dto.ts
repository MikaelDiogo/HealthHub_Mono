import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
  status!: string;

  @IsOptional()
  @IsString()
  motivo_visita?: string;
}
