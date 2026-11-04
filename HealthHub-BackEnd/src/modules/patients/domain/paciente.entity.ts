import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SinaisVitais } from '../../sinais-vitais/domain/sinais-vitais.entity';

@Entity('pacientes')
export class Paciente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  nome_completo!: string;

  // Só o nome é obrigatório: CPF, idade e sexo podem faltar (paciente sem documentos ou sem identificação).
  // O CPF continua único quando preenchido (no PostgreSQL vários NULL não colidem).
  @Column('varchar', { unique: true, nullable: true })
  cpf?: string | null;

  @Column('varchar', { nullable: true })
  rg?: string | null;

  @Column('int', { nullable: true })
  idade?: number | null;

  @Column('varchar', { nullable: true })
  sexo?: string | null;

  @Column('varchar', { nullable: true })
  telefone?: string | null;

  @Column('text', { nullable: true })
  endereco?: string | null;

  @Column('text', { nullable: true })
  alergias?: string | null;

  @Column('text', { nullable: true })
  medicamentos_em_uso?: string | null;

  @Column('text', { nullable: true })
  anamnese?: string | null;

  // Falso quando o paciente recebeu alta e ainda não foi readmitido na esteira —
  // some da listagem padrão, mas o cadastro e o histórico de visitas são preservados.
  @Column('boolean', { default: true })
  ativo!: boolean;

  // Verdadeiro quando o nome foi gerado pelo sistema ("Paciente não identificado (#xxxx)") por o paciente ainda
  // não ter sido identificado. Volta a falso quando alguém grava um nome diferente do provisório.
  @Column('boolean', { default: false })
  nome_provisorio!: boolean;

  @OneToMany(() => SinaisVitais, (sinais) => sinais.paciente)
  sinaisVitais!: SinaisVitais[];
}
