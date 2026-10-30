import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { GRAVIDADES_RISCO, STATUS_ATUALIZACAO } from '../../domain/fila-valores';

export class UpdateFilaDto {
  @IsString()
  @MaxLength(50)
  @IsIn(STATUS_ATUALIZACAO, { message: 'Status inválido para a esteira' })
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn(GRAVIDADES_RISCO, { message: 'Categoria de risco inválida (Vermelho, Laranja, Amarelo, Verde ou Azul)' })
  gravidade?: string;

  /** Justificativa livre e opcional do enfermeiro ao classificar (fica no registro de rastreabilidade). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justificativa?: string;
}
