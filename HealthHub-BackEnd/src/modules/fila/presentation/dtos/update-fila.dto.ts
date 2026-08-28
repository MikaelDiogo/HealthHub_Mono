import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFilaDto {
  @IsString()
  @MaxLength(50)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gravidade?: string;
}
