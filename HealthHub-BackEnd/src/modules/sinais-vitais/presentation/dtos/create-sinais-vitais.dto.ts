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
