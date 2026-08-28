import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fila_pacientes')
export class FilaPaciente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  paciente_id!: string;

  @Column('varchar')
  nome!: string;

  @Column('int')
  idade!: number;

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
}
