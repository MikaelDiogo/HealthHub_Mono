import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SinaisVitais } from '../../sinais-vitais/domain/sinais-vitais.entity';

@Entity('pacientes')
export class Paciente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  nome_completo!: string;

  @Column('varchar', { unique: true })
  cpf!: string;

  @Column('varchar', { nullable: true })
  rg?: string;

  @Column('int')
  idade!: number;

  @Column('varchar')
  sexo!: string;

  @Column('varchar', { nullable: true })
  telefone?: string;

  @Column('text', { nullable: true })
  endereco?: string;

  @Column('text', { nullable: true })
  alergias?: string;

  @Column('text', { nullable: true })
  medicamentos_em_uso?: string;

  @Column('text', { nullable: true })
  anamnese?: string;

  @OneToMany(() => SinaisVitais, (sinais) => sinais.paciente)
  sinaisVitais!: SinaisVitais[];
}
