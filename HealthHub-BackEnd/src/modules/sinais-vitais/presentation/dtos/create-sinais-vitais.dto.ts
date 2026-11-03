import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSinaisVitaisDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Frequência cardíaca deve estar entre 0 e 300 bpm' })
  @Min(0, { message: 'Frequência cardíaca deve estar entre 0 e 300 bpm' })
  @Max(300, { message: 'Frequência cardíaca deve estar entre 0 e 300 bpm' })
  frequencia_cardiaca?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Saturação (SpO₂) deve estar entre 0 e 100%' })
  @Min(0, { message: 'Saturação (SpO₂) deve estar entre 0 e 100%' })
  @Max(100, { message: 'Saturação (SpO₂) deve estar entre 0 e 100%' })
  saturacao_oxigenio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Pressão arterial deve ter no máximo 20 caracteres' })
  pressao_arterial?: string;

  // Faixa técnica mínima (inteiro >= 0); nenhum limite clínico foi escolhido: o autor informa se quiser um teto.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Pressão sistólica deve ser um número inteiro (mmHg)' })
  @Min(0, { message: 'Pressão sistólica não pode ser negativa' })
  pressao_sistolica?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Pressão diastólica deve ser um número inteiro (mmHg)' })
  @Min(0, { message: 'Pressão diastólica não pode ser negativa' })
  pressao_diastolica?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Temperatura deve estar entre 25 e 45 °C' })
  @Min(25, { message: 'Temperatura deve estar entre 25 e 45 °C' })
  @Max(45, { message: 'Temperatura deve estar entre 25 e 45 °C' })
  temperatura?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hora?: number;
}
