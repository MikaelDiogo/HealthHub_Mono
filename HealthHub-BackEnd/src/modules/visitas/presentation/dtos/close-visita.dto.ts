import { IsOptional, IsString, IsIn } from 'class-validator';

export class CloseVisitaDto {
  @IsOptional()
  @IsString()
  @IsIn(['Alta', 'Internacao', 'Transferencia', 'Saida Voluntaria'])
  desfecho?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'])
  classificacao_risco?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
