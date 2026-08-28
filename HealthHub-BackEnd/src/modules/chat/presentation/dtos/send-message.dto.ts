import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Mensagem não pode ser vazia' })
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsIn(['normal', 'urgente'])
  priority?: 'normal' | 'urgente';
}
