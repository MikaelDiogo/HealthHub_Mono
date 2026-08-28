import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
  @MaxLength(150)
  nome_completo!: string;

  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rg?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(150)
  idade!: number;

  @IsIn(['M', 'F', 'Outro'])
  sexo!: string;

  @IsOptional()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  endereco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  alergias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medicamentos_em_uso?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  anamnese?: string;
}
