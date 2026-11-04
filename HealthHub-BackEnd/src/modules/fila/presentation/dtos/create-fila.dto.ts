import { Transform } from 'class-transformer';
import { idadeOuNulo } from '../../../patients/presentation/dtos/create-patient.dto';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { STATUS_ESTEIRA } from '../../domain/fila-valores';

export class CreateFilaDto {
  @IsUUID()
  paciente_id!: string;

  @IsString()
  @MaxLength(150)
  nome!: string;

  // Opcional: o cadastro mínimo só exige o nome.
  @IsOptional()
  @Transform(idadeOuNulo)
  @IsInt()
  idade?: number | null;

  // Ignorada: a senha (PR-NNN) é gerada pelo servidor, de forma atômica. Mantida por compatibilidade com clientes antigos.
  @IsOptional()
  @IsString()
  @MaxLength(20)
  senha?: string;

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
