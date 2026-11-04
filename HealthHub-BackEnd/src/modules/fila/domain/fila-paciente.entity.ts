import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fila_pacientes')
export class FilaPaciente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  paciente_id!: string;

  @Column('varchar')
  nome!: string;

  // Cópia do cadastro: pode faltar (cadastro mínimo). Atualizada quando o cadastro é editado.
  @Column('int', { nullable: true })
  idade?: number | null;

  @Column('varchar')
  senha!: string;

  @Column('varchar')
  chegada!: string;

  @Column('varchar')
  status!: string;

  @Column('varchar', { nullable: true })
  gravidade?: string;

  @CreateDateColumn()
  created_at!: Date;

  // Não é coluna: vem do cadastro (junção na listagem) para a tela mostrar o selo "Nome provisório"
  nome_provisorio?: boolean;
}
