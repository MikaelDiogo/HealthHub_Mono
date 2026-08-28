import { IsUUID } from 'class-validator';

export class OpenDirectDto {
  @IsUUID()
  user_id!: string;
}
