import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSinaisVitaisDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(300)
  frequencia_cardiaca?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  saturacao_oxigenio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  pressao_arterial?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(25)
  @Max(45)
  temperatura?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hora?: number;
}
