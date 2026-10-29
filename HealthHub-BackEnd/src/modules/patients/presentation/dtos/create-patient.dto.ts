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
  @IsString({ message: 'Nome completo é obrigatório (3 a 150 caracteres)' })
  @MinLength(3, { message: 'Nome completo é obrigatório (3 a 150 caracteres)' })
  @MaxLength(150, { message: 'Nome completo é obrigatório (3 a 150 caracteres)' })
  nome_completo!: string;

  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rg?: string;

  @Type(() => Number)
  @IsInt({ message: 'Idade é obrigatória (0 a 150)' })
  @Min(0, { message: 'Idade é obrigatória (0 a 150)' })
  @Max(150, { message: 'Idade é obrigatória (0 a 150)' })
  idade!: number;

  @IsIn(['M', 'F', 'Outro'], { message: 'Sexo deve ser M, F ou Outro' })
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
