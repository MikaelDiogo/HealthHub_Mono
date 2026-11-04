import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

// Só o nome é obrigatório (em urgência o paciente pode chegar sem documentos ou sem identificação).
// Os demais campos são opcionais: "" (campo limpo no formulário) vira null e o formato só é validado quando há valor.
const vazioParaNulo = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
// Idade chega como número ou texto: vazio vira null, texto numérico vira número, o resto segue e falha em @IsInt
export const idadeOuNulo = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const v = obj[key];
  if (v === null || (typeof v === 'string' && v.trim() === '')) return null;
  return typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v;
};
const textoAparado = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePatientDto {
  // Com nome_desconhecido=true o nome é ignorado: o servidor grava "Paciente não identificado (#xxxx)".
  @IsOptional()
  @IsBoolean({ message: 'nome_desconhecido deve ser verdadeiro ou falso' })
  nome_desconhecido?: boolean;

  @ValidateIf((o: CreatePatientDto) => o.nome_desconhecido !== true)
  @Transform(textoAparado)
  @IsString({ message: 'Nome completo é obrigatório (até 150 caracteres)' })
  @MinLength(1, { message: 'Nome completo é obrigatório (até 150 caracteres)' })
  @MaxLength(150, { message: 'Nome completo é obrigatório (até 150 caracteres)' })
  nome_completo?: string;

  @IsOptional()
  @Transform(vazioParaNulo)
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos' })
  cpf?: string | null;

  @IsOptional()
  @Transform(vazioParaNulo)
  @IsString()
  @MaxLength(20)
  rg?: string | null;

  @IsOptional()
  @Transform(idadeOuNulo)
  @IsInt({ message: 'Idade deve ser um número inteiro de 0 a 150' })
  @Min(0, { message: 'Idade deve ser um número inteiro de 0 a 150' })
  @Max(150, { message: 'Idade deve ser um número inteiro de 0 a 150' })
  idade?: number | null;

  @IsOptional()
  @Transform(vazioParaNulo)
  @IsIn(['M', 'F', 'Outro'], { message: 'Sexo deve ser M, F ou Outro' })
  sexo?: string | null;

  @IsOptional()
  @Transform(vazioParaNulo)
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  telefone?: string | null;

  @IsOptional()
  @Transform(vazioParaNulo)
  @IsString()
  @MaxLength(300)
  endereco?: string | null;

  @IsOptional()
  @Transform(vazioParaNulo)
  @IsString()
  @MaxLength(1000)
  alergias?: string | null;

  @IsOptional()
  @Transform(vazioParaNulo)
  @IsString()
  @MaxLength(1000)
  medicamentos_em_uso?: string | null;

  @IsOptional()
  @Transform(vazioParaNulo)
  @IsString()
  @MaxLength(5000)
  anamnese?: string | null;
}
